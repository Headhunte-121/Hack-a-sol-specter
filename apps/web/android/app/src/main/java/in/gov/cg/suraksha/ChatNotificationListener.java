package in.gov.cg.suraksha;

import android.app.Notification;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Reads incoming messages from the phone's messaging app notifications, so that messages sent over RCS ("Chat" in Google Messages: the ones with a
 * chat bubble on the picture, business senders with a tick, and chats with a person) can be checked too. Those messages are not SMS, are not in the SMS
 * database and never fire an SMS broadcast, so no app can read them through the SMS permission.
 *
 * Privacy: only notifications of the messaging apps listed below are looked at (every other notification is ignored before anything is read from it),
 * only message text, sender and time are kept, at most {@link #MAX} messages, in a file that is excluded from Android backup, on this phone only.
 * The user turns it on in Android's own "Notification access" settings and can turn it off there; "Delete all my data" in the app clears the file.
 */
public class ChatNotificationListener extends NotificationListenerService {

    private static final String FILE = "chat_messages.json";
    private static final int MAX = 60;
    private static final int MAX_BODY = 2000;
    private static final Object LOCK = new Object();

    private static final Set<String> MESSAGING_APPS = new HashSet<>(Arrays.asList(
        "com.google.android.apps.messaging",
        "com.samsung.android.messaging",
        "com.android.mms",
        "com.android.messaging",
        "com.whatsapp",
        "com.whatsapp.w4b"
    ));

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        record(getApplicationContext(), sbn);
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) record(getApplicationContext(), sbn);
        } catch (Exception ignored) {
            // the system may refuse while it is still binding; the next notification is recorded anyway
        }
    }

    private static void record(Context ctx, StatusBarNotification sbn) {
        try {
            if (sbn == null || !MESSAGING_APPS.contains(sbn.getPackageName())) return;
            Notification n = sbn.getNotification();
            if (n == null) return;
            if ((n.flags & (Notification.FLAG_GROUP_SUMMARY | Notification.FLAG_ONGOING_EVENT)) != 0) return;

            String pkg = sbn.getPackageName();
            String via = pkg != null && pkg.startsWith("com.whatsapp") ? "whatsapp" : "chat";

            JSONArray fresh = new JSONArray();
            NotificationCompat.MessagingStyle style = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(n);
            if (style != null) {
                CharSequence conversation = style.getConversationTitle();
                List<NotificationCompat.MessagingStyle.Message> messages = style.getMessages();
                for (NotificationCompat.MessagingStyle.Message m : messages) {
                    Person from = m.getPerson();
                    if (from == null) continue; // a message the user sent has no sender person
                    CharSequence name = from.getName();
                    String sender = name != null && name.length() > 0 ? name.toString() : (conversation != null ? conversation.toString() : "");
                    fresh.put(entry(sender, m.getText(), m.getTimestamp() > 0 ? m.getTimestamp() : sbn.getPostTime(), via));
                }
            } else if (Notification.CATEGORY_MESSAGE.equals(n.category)) {
                Bundle extras = n.extras;
                if (extras == null) return;
                CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
                CharSequence text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
                if (text == null || text.length() == 0) text = extras.getCharSequence(Notification.EXTRA_TEXT);
                fresh.put(entry(title != null ? title.toString() : "", text, sbn.getPostTime(), via));
            }
            if (fresh.length() > 0) {
                store(ctx, fresh);
                for (int i = 0; i < fresh.length(); i++) {
                    JSONObject item = fresh.optJSONObject(i);
                    if (item != null) {
                        SmsReaderPlugin.deliverLiveChat(
                            item.optString("sender"),
                            item.optString("body"),
                            item.optLong("date"),
                            item.optString("via", "chat")
                        );
                    }
                }
            }
        } catch (Exception ignored) {
            // a malformed notification must never crash the listener
        }
    }

    private static JSONObject entry(String sender, CharSequence text, long date, String via) {
        try {
            if (text == null) return null;
            String body = text.toString().trim();
            if (body.isEmpty()) return null;
            if (body.length() > MAX_BODY) body = body.substring(0, MAX_BODY);
            JSONObject o = new JSONObject();
            o.put("id", via + "-" + Integer.toHexString((sender + "|" + body).hashCode()));
            o.put("sender", sender);
            o.put("body", body);
            o.put("date", date);
            o.put("via", via);
            return o;
        } catch (Exception e) {
            return null;
        }
    }

    private static File file(Context ctx) {
        return new File(ctx.getNoBackupFilesDir(), FILE); // not part of Android auto-backup
    }

    private static JSONArray load(Context ctx) {
        File f = file(ctx);
        if (!f.exists()) return new JSONArray();
        try (FileInputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int r;
            while ((r = in.read(buf)) > 0) out.write(buf, 0, r);
            return new JSONArray(new String(out.toByteArray(), StandardCharsets.UTF_8));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static void store(Context ctx, JSONArray fresh) throws Exception {
        synchronized (LOCK) {
            JSONArray old = load(ctx);
            JSONArray merged = new JSONArray();
            Set<String> ids = new HashSet<>();
            // newest first: the new messages, then the ones already kept, without the same sender and text twice
            for (int i = 0; i < fresh.length(); i++) {
                JSONObject o = fresh.optJSONObject(i);
                if (o != null && ids.add(o.getString("id"))) merged.put(o);
            }
            for (int i = 0; i < old.length() && merged.length() < MAX; i++) {
                JSONObject o = old.optJSONObject(i);
                if (o != null && ids.add(o.getString("id"))) merged.put(o);
            }
            JSONArray trimmed = new JSONArray();
            for (int i = 0; i < merged.length() && i < MAX; i++) trimmed.put(merged.get(i));
            try (FileOutputStream out = new FileOutputStream(file(ctx))) {
                out.write(trimmed.toString().getBytes(StandardCharsets.UTF_8));
            }
        }
    }

    /** The kept messages, newest first, as the plugin returns them to the web page. */
    public static JSArray read(Context ctx, int limit) {
        JSArray result = new JSArray();
        synchronized (LOCK) {
            JSONArray all = load(ctx);
            // sort by date, newest first (new messages are put in front, but one conversation can bring older messages with it)
            java.util.ArrayList<JSONObject> rows = new java.util.ArrayList<>();
            for (int i = 0; i < all.length(); i++) {
                JSONObject o = all.optJSONObject(i);
                if (o != null) rows.add(o);
            }
            java.util.Collections.sort(rows, (a, b) -> Long.compare(b.optLong("date"), a.optLong("date")));
            for (int i = 0; i < rows.size() && i < limit; i++) {
                JSONObject o = rows.get(i);
                JSObject row = new JSObject();
                row.put("id", o.optString("id"));
                row.put("sender", o.optString("sender"));
                row.put("body", o.optString("body"));
                row.put("date", o.optLong("date"));
                row.put("via", "chat");
                result.put(row);
            }
        }
        return result;
    }

    public static void clear(Context ctx) {
        synchronized (LOCK) {
            File f = file(ctx);
            if (f.exists()) f.delete();
        }
    }
}
