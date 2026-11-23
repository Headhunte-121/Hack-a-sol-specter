package in.gov.cg.suraksha;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Settings;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS
            }
        )
    }
)
public class SmsReaderPlugin extends Plugin {

    private static SmsReaderPlugin activeInstance;
    private static String pendingSharedText = null;
    private BroadcastReceiver smsReceiver;

    @Override
    public void load() {
        super.load();
        activeInstance = this;
    }

    /** Called by MainActivity when WhatsApp / SMS shares plain text to Suraksha. */
    public static void deliverSharedText(String text) {
        if (text == null || text.trim().isEmpty()) return;
        pendingSharedText = text.trim();
        if (activeInstance != null) {
            JSObject payload = new JSObject();
            payload.put("text", pendingSharedText);
            activeInstance.notifyListeners("sharedText", payload, true);
        }
    }

    @PluginMethod
    public void getPendingSharedText(PluginCall call) {
        JSObject res = new JSObject();
        res.put("text", pendingSharedText);
        pendingSharedText = null;
        call.resolve(res);
    }

    @PluginMethod
    public void getRecentSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }
        readInbox(call);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }
        registerSmsReceiver(call);
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        unregisterSafe();
        call.resolve();
    }

    // ---- Chat (RCS) messages: read from the messaging app's notifications, see ChatNotificationListener ----

    private boolean chatAccessEnabled() {
        return NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
    }

    @PluginMethod
    public void getChatMessages(PluginCall call) {
        JSObject res = new JSObject();
        res.put("enabled", chatAccessEnabled());
        res.put("messages", ChatNotificationListener.read(getContext(), call.getInt("limit", 30)));
        call.resolve(res);
    }

    /** Opens Android's "Notification access" list, where the user turns Suraksha on or off. */
    @PluginMethod
    public void openChatAccessSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the notification access settings");
        }
    }

    /** Opens this app's "App info" page (on Android 13 and later an app that was not installed from a store needs "Allow restricted settings" there first). */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the app settings");
        }
    }

    @PluginMethod
    public void clearChatMessages(PluginCall call) {
        ChatNotificationListener.clear(getContext());
        call.resolve();
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            if ("startListening".equals(call.getMethodName())) {
                registerSmsReceiver(call);
            } else {
                readInbox(call);
            }
        } else {
            call.reject("SMS permission denied");
        }
    }

    private void readInbox(PluginCall call) {
        int limit = call.getInt("limit", 30);
        JSArray messages = new JSArray();
        String[] cols = {
            Telephony.Sms._ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE
        };

        try (Cursor cursor = getContext().getContentResolver().query(
            Telephony.Sms.Inbox.CONTENT_URI,
            cols,
            null,
            null,
            Telephony.Sms.DATE + " DESC"
        )) {
            int count = 0;
            if (cursor != null) {
                int idIdx = cursor.getColumnIndexOrThrow(Telephony.Sms._ID);
                int addrIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS);
                int bodyIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY);
                int dateIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE);

                while (cursor.moveToNext() && count < limit) {
                    JSObject row = new JSObject();
                    row.put("id", cursor.getString(idIdx));
                    row.put("sender", cursor.getString(addrIdx));
                    row.put("body", cursor.getString(bodyIdx));
                    row.put("date", cursor.getLong(dateIdx));
                    messages.put(row);
                    count++;
                }
            }
            JSObject result = new JSObject();
            result.put("messages", messages);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not read SMS inbox: " + e.getMessage());
        }
    }

    private void registerSmsReceiver(PluginCall call) {
        if (smsReceiver != null) {
            call.resolve();
            return;
        }
        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
                SmsMessage[] parts = Telephony.Sms.Intents.getMessagesFromIntent(intent);
                if (parts == null || parts.length == 0) return;

                // Merge multi-part SMS into one body before on-device ML scoring
                StringBuilder body = new StringBuilder();
                String sender = parts[0].getDisplayOriginatingAddress();
                long ts = parts[0].getTimestampMillis();
                for (SmsMessage part : parts) {
                    if (part.getMessageBody() != null) body.append(part.getMessageBody());
                }

                JSObject payload = new JSObject();
                payload.put("id", "live-" + ts);
                payload.put("sender", sender != null ? sender : "");
                payload.put("body", body.toString());
                payload.put("date", ts);
                notifyListeners("smsReceived", payload, true);
            }
        };

        IntentFilter filter = new IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION);
        ContextCompat.registerReceiver(getContext(), smsReceiver, filter, ContextCompat.RECEIVER_EXPORTED);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        unregisterSafe();
        if (activeInstance == this) activeInstance = null;
        super.handleOnDestroy();
    }

    private void unregisterSafe() {
        if (smsReceiver != null) {
            try {
                getContext().unregisterReceiver(smsReceiver);
            } catch (IllegalArgumentException ignored) {}
            smsReceiver = null;
        }
    }
}
