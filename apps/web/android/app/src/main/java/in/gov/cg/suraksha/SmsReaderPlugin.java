package in.gov.cg.suraksha;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.ContentObserver;
import android.database.Cursor;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
    private ContentObserver mmsObserver;
    private long lastSeenMmsId = -1;

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

    /** Called by ChatNotificationListener when a live RCS or WhatsApp message arrives. */
    public static void deliverLiveChat(String sender, String body, long date, String via) {
        if (body == null || body.trim().isEmpty()) return;
        if (activeInstance != null) {
            JSObject payload = new JSObject();
            payload.put("id", "live-" + via + "-" + date);
            payload.put("sender", sender != null ? sender : "");
            payload.put("body", body.trim());
            payload.put("date", date);
            payload.put("via", via);
            activeInstance.notifyListeners("smsReceived", payload, true);
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
        try {
            List<JSObject> all = new ArrayList<>();
            all.addAll(querySmsInbox(limit));
            all.addAll(queryMmsRcsInbox(limit));

            // Deduplicate (same body in same minute bucket)
            Set<String> seen = new HashSet<>();
            List<JSObject> combined = new ArrayList<>();
            for (JSObject o : all) {
                String body = o.optString("body", "").trim();
                long minuteBucket = o.optLong("date", 0L) / 60000L;
                String key = minuteBucket + "|" + body;
                if (seen.add(key)) combined.add(o);
            }

            // Sort newest first across SMS + RCS
            Collections.sort(combined, (a, b) -> Long.compare(b.optLong("date", 0L), a.optLong("date", 0L)));

            JSArray messages = new JSArray();
            int n = Math.min(limit, combined.size());
            for (int i = 0; i < n; i++) messages.put(combined.get(i));

            JSObject result = new JSObject();
            result.put("messages", messages);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not read messages: " + e.getMessage());
        }
    }

    private List<JSObject> querySmsInbox(int limit) {
        List<JSObject> list = new ArrayList<>();
        String[] cols = { Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE };
        try (Cursor c = getContext().getContentResolver().query(
            Telephony.Sms.Inbox.CONTENT_URI, cols, null, null, Telephony.Sms.DATE + " DESC"
        )) {
            if (c == null) return list;
            int idIdx = c.getColumnIndexOrThrow(Telephony.Sms._ID);
            int addrIdx = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS);
            int bodyIdx = c.getColumnIndexOrThrow(Telephony.Sms.BODY);
            int dateIdx = c.getColumnIndexOrThrow(Telephony.Sms.DATE);

            while (c.moveToNext() && list.size() < limit) {
                String body = c.getString(bodyIdx);
                if (body == null || body.trim().isEmpty()) continue;
                JSObject row = new JSObject();
                row.put("id", c.getString(idIdx));
                row.put("sender", c.getString(addrIdx));
                row.put("body", body);
                row.put("date", c.getLong(dateIdx));
                list.add(row);
            }
        } catch (Exception ignored) {}
        return list;
    }

    /** Reads content://mms/inbox where Google Messages mirrors RCS messages. */
    private List<JSObject> queryMmsRcsInbox(int limit) {
        List<JSObject> list = new ArrayList<>();
        ContentResolver cr = getContext().getContentResolver();
        String[] cols = { Telephony.Mms._ID, Telephony.Mms.DATE };

        try (Cursor c = cr.query(
            Telephony.Mms.Inbox.CONTENT_URI, cols, null, null, Telephony.Mms.DATE + " DESC"
        )) {
            if (c == null) return list;
            int idIdx = c.getColumnIndexOrThrow(Telephony.Mms._ID);
            int dateIdx = c.getColumnIndexOrThrow(Telephony.Mms.DATE);

            while (c.moveToNext() && list.size() < limit) {
                long mmsId = c.getLong(idIdx);
                if (lastSeenMmsId < mmsId) lastSeenMmsId = mmsId;

                String body = readMmsTextBody(cr, mmsId);
                if (body == null || body.trim().isEmpty()) continue;

                String sender = readMmsSender(cr, mmsId);
                long rawDate = c.getLong(dateIdx);
                // CRITICAL: Telephony.Mms.DATE is in SECONDS, while Telephony.Sms.DATE is in MILLISECONDS
                long dateMs = rawDate < 10_000_000_000L ? rawDate * 1000L : rawDate;

                JSObject row = new JSObject();
                row.put("id", "rcs-" + mmsId);
                row.put("sender", sender);
                row.put("body", body.trim());
                row.put("date", dateMs);
                row.put("via", "chat");
                list.add(row);
            }
        } catch (Exception ignored) {
            // Some OEM ROMs restrict MMS queries; fall back cleanly to SMS + NotificationListener
        }
        return list;
    }

    private String readMmsTextBody(ContentResolver cr, long mmsId) {
        StringBuilder sb = new StringBuilder();
        Uri partUri = Uri.parse("content://mms/part");
        String[] cols = { "_id", "ct", "text", "_data" };
        try (Cursor p = cr.query(partUri, cols, "mid=?", new String[]{ String.valueOf(mmsId) }, null)) {
            if (p == null) return "";
            while (p.moveToNext()) {
                String ct = p.getString(1);
                if (ct == null) continue;
                String partId = p.getString(0);
                String dataPath = p.getString(3);
                String raw = (dataPath != null) ? readPartStream(cr, partId) : p.getString(2);
                if (raw == null || raw.trim().isEmpty()) continue;

                if ("text/plain".equalsIgnoreCase(ct)) {
                    if (sb.length() > 0) sb.append("\n");
                    sb.append(raw.trim());
                } else if (ct.toLowerCase().contains("botmessage") || ct.toLowerCase().contains("json")) {
                    // Extracts text/title/description from Google Business RCS (RBM) rich cards
                    String extracted = extractRbmJsonText(raw);
                    if (!extracted.isEmpty()) {
                        if (sb.length() > 0) sb.append("\n");
                        sb.append(extracted);
                    }
                }
            }
        } catch (Exception ignored) {}
        return sb.toString();
    }

    private String readPartStream(ContentResolver cr, String partId) {
        Uri uri = Uri.parse("content://mms/part/" + partId);
        StringBuilder sb = new StringBuilder();
        try (InputStream is = cr.openInputStream(uri)) {
            if (is == null) return "";
            BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            String line;
            while ((line = br.readLine()) != null) {
                if (sb.length() > 0) sb.append("\n");
                sb.append(line);
            }
        } catch (Exception ignored) {}
        return sb.toString();
    }

    private String extractRbmJsonText(String json) {
        StringBuilder out = new StringBuilder();
        try {
            collectJsonFields(new JSONObject(json), out);
        } catch (Exception ignored) {}
        return out.toString().trim();
    }

    private void collectJsonFields(Object node, StringBuilder out) {
        if (node instanceof JSONObject) {
            JSONObject obj = (JSONObject) node;
            for (String k : new String[]{ "title", "description", "text", "displayText" }) {
                String v = obj.optString(k, "").trim();
                if (!v.isEmpty()) {
                    if (out.length() > 0) out.append(" ");
                    out.append(v);
                }
            }
            JSONArray names = obj.names();
            if (names != null) {
                for (int i = 0; i < names.length(); i++) {
                    Object child = obj.opt(names.optString(i));
                    if (child instanceof JSONObject || child instanceof JSONArray) collectJsonFields(child, out);
                }
            }
        } else if (node instanceof JSONArray) {
            JSONArray arr = (JSONArray) node;
            for (int i = 0; i < arr.length(); i++) collectJsonFields(arr.opt(i), out);
        }
    }

    private String readMmsSender(ContentResolver cr, long mmsId) {
        Uri addrUri = Uri.parse("content://mms/" + mmsId + "/addr");
        // 137 = PduHeaders.FROM (sender address)
        try (Cursor a = cr.query(addrUri, new String[]{ "address" }, "type=137", null, null)) {
            if (a != null && a.moveToFirst()) {
                String addr = a.getString(0);
                if (addr != null && !"insert-address-token".equals(addr)) return addr;
            }
        } catch (Exception ignored) {}
        return "RCS";
    }

    private void registerSmsReceiver(PluginCall call) {
        if (smsReceiver == null) {
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
        }

        // Also watch content://mms-sms/ so newly arriving mirrored RCS messages trigger live!
        if (mmsObserver == null) {
            mmsObserver = new ContentObserver(new Handler(Looper.getMainLooper())) {
                @Override
                public void onChange(boolean selfChange) {
                    List<JSObject> latest = queryMmsRcsInbox(1);
                    if (!latest.isEmpty()) {
                        JSObject item = latest.get(0);
                        String idStr = item.optString("id", "").replace("rcs-", "");
                        try {
                            long id = Long.parseLong(idStr);
                            if (id > lastSeenMmsId) {
                                lastSeenMmsId = id;
                                notifyListeners("smsReceived", item, true);
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }
            };
            try {
                getContext().getContentResolver().registerContentObserver(
                    Uri.parse("content://mms-sms/"), true, mmsObserver
                );
            } catch (Exception ignored) {}
        }

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
        if (mmsObserver != null) {
            try {
                getContext().getContentResolver().unregisterContentObserver(mmsObserver);
            } catch (Exception ignored) {}
            mmsObserver = null;
        }
    }
}
