package app.loin.focus;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Brings the task back to LockIn so the Activity can leave lock task at timer expiry. */
public class LockInSessionAlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        // Handle timer expiry - bring LockIn to unlock
        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launch);
    }
}
