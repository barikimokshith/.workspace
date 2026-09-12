package app.loin.focus;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Device Owner recovery after reboot. The manager re-applies lock task on resume. */
public class LockInBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        LoinLockManager manager = new LoinLockManager(context);
        if (!manager.isActive() || !manager.isDeviceOwner()) return;
        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launch);
    }
}
