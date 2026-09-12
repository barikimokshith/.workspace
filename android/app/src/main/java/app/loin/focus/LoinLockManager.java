package app.loin.focus;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.ActivityManager;
import android.app.PendingIntent;
import android.app.admin.DevicePolicyManager;
import android.content.Intent;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.os.Build;
import java.util.HashSet;
import java.util.Set;

public final class LoinLockManager {
    private static final String PREFS = "loin.lock.native";
    private static final String ACTIVE = "active";
    private static final String SESSION_ID = "sessionId";
    private static final String STARTED_AT = "startedAt";
    private static final String END_AT = "endAt";
    private static final String HAS_TIMER = "hasTimer";
    private static final String WHITELIST = "whitelist";
    private static final String GOAL = "goal";

    private final Context context;
    private final SharedPreferences prefs;
    private BroadcastReceiver appSwitchReceiver;
    private boolean isMonitoring = false;

    public LoinLockManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        this.appSwitchReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Intent.ACTION_USER_PRESENT.equals(intent.getAction())) {
                    enforceLock();
                }
            }
        };
    }
    
    private void enforceLock() {
        if (!isActive()) return;
        
        // Force bring LockIn back to foreground
        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launch.addFlags(Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT);
        context.startActivity(launch);
    }
    
    private void startAppMonitoring() {
        if (isMonitoring) return;
        
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_USER_PRESENT);
        context.registerReceiver(appSwitchReceiver, filter);
        isMonitoring = true;
        android.util.Log.d("LoinLockManager", "Started app switch monitoring");
    }
    
    private void stopAppMonitoring() {
        if (!isMonitoring) return;
        
        try {
            context.unregisterReceiver(appSwitchReceiver);
            isMonitoring = false;
            android.util.Log.d("LoinLockManager", "Stopped app switch monitoring");
        } catch (Exception e) {
            android.util.Log.w("LoinLockManager", "Failed to stop app monitoring: " + e.getMessage());
        }
    }

    public boolean isDeviceOwner() {
        DevicePolicyManager policy = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
        return policy != null && policy.isDeviceOwnerApp(context.getPackageName());
    }

    public boolean isActive() {
        return prefs.getBoolean(ACTIVE, false);
    }

    public boolean start(Activity activity, String sessionId, String goal, long startedAt, long endAt, boolean hasTimer, Set<String> whitelist) {
        android.util.Log.d("LoinLockManager", "startLockSession called: sessionId=" + sessionId + ", goal=" + goal + ", hasTimer=" + hasTimer);
        
        if (!isDeviceOwner()) {
            android.util.Log.e("LoinLockManager", "Not device owner - cannot start lock session");
            return false;
        }
        
        DevicePolicyManager policy = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
        if (policy == null) {
            android.util.Log.e("LoinLockManager", "DevicePolicyManager is null");
            return false;
        }

        Set<String> permitted = new HashSet<>(whitelist);
        permitted.add(context.getPackageName());
        android.util.Log.d("LoinLockManager", "Setting lock task packages: " + permitted);
        
        try {
            // Set lock task packages first
            policy.setLockTaskPackages(new ComponentName(context, LockInDeviceAdminReceiver.class), permitted.toArray(new String[0]));
            
            // Set minimal lock task features and explicitly disable the status bar.
            android.util.Log.d("LoinLockManager", "Setting minimal lock task features (disabling all navigation)");
            policy.setLockTaskFeatures(
                new ComponentName(context, LockInDeviceAdminReceiver.class),
                DevicePolicyManager.LOCK_TASK_FEATURE_NONE
            );
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                policy.setStatusBarDisabled(new ComponentName(context, LockInDeviceAdminReceiver.class), true);
            }
        } catch (Exception e) {
            android.util.Log.e("LoinLockManager", "Failed to set lock task configuration: " + e.getMessage());
            return false;
        }
        
        prefs.edit()
            .putBoolean(ACTIVE, true)
            .putString(SESSION_ID, sessionId)
            .putString(GOAL, goal)
            .putLong(STARTED_AT, startedAt)
            .putLong(END_AT, endAt)
            .putBoolean(HAS_TIMER, hasTimer)
            .putStringSet(WHITELIST, permitted)
            .apply();
        
        android.util.Log.d("LoinLockManager", "Lock session data saved to preferences");
        
        scheduleExpiry(endAt, hasTimer);
        
        // Start app switch monitoring
        startAppMonitoring();
        
        // Start foreground service to keep app alive
        android.util.Log.d("LoinLockManager", "Starting foreground lock service");
        Intent serviceIntent = new Intent(context, LoinLockService.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
        
        android.util.Log.d("LoinLockManager", "Calling activity.startLockTask()");
        try {
            ensureLockTask(activity);
            android.util.Log.d("LoinLockManager", "Lock task started successfully");
        } catch (Exception e) {
            android.util.Log.e("LoinLockManager", "Failed to start lock task: " + e.getMessage());
            android.util.Log.e("LoinLockManager", "Stack trace:", e);
            return false;
        }
        
        return true;
    }

    public void stop(Activity activity) {
        android.util.Log.d("LoinLockManager", "stopLockSession called");
        
        // Stop app monitoring
        stopAppMonitoring();
        
        if (isActive()) {
            try { 
                android.util.Log.d("LoinLockManager", "Calling activity.stopLockTask()");
                activity.stopLockTask(); 
                android.util.Log.d("LoinLockManager", "Lock task stopped successfully");
            } catch (IllegalStateException e) {
                android.util.Log.w("LoinLockManager", "stopLockTask failed: " + e.getMessage());
            }
            disableStatusBar();
            clearLockTaskPackages();
        }
        cancelExpiry();
        
        // Stop foreground service
        android.util.Log.d("LoinLockManager", "Stopping foreground lock service");
        Intent serviceIntent = new Intent(context, LoinLockService.class);
        context.stopService(serviceIntent);
        
        prefs.edit().clear().apply();
        android.util.Log.d("LoinLockManager", "Lock session data cleared");
    }

    public void restore(Activity activity) {
        android.util.Log.d("LoinLockManager", "restoreLock called");
        if (!isActive()) {
            android.util.Log.d("LoinLockManager", "No active session to restore");
            return;
        }
        if (!isDeviceOwner()) {
            android.util.Log.e("LoinLockManager", "Not device owner - cannot restore lock session");
            return;
        }
        long endAt = prefs.getLong(END_AT, 0L);
        if (prefs.getBoolean(HAS_TIMER, false) && endAt > 0L && System.currentTimeMillis() >= endAt) {
            android.util.Log.d("LoinLockManager", "Timer expired during restore - stopping session");
            stop(activity);
            return;
        }
        try {
            android.util.Log.d("LoinLockManager", "Restoring lock task mode");
            enableStatusBarLockdown();
            ensureLockTask(activity);
            android.util.Log.d("LoinLockManager", "Lock task restored successfully");
        } catch (IllegalStateException e) {
            android.util.Log.w("LoinLockManager", "restoreLockTask failed (activity not in foreground): " + e.getMessage());
        } catch (IllegalArgumentException e) {
            android.util.Log.w("LoinLockManager", "restoreLockTask failed (invalid task state): " + e.getMessage());
        } catch (Exception e) {
            android.util.Log.w("LoinLockManager", "restoreLockTask failed: " + e.getMessage());
        }
    }

    public boolean ensureLockTask(Activity activity) {
        ActivityManager activityManager =
            (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager != null
            && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            && activityManager.getLockTaskModeState() == ActivityManager.LOCK_TASK_MODE_LOCKED) {
            return true;
        }

        android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        Runnable[] retry = new Runnable[1];
        retry[0] = () -> {
            if (!isActive()) return;
            if (activityManager != null
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && activityManager.getLockTaskModeState() == ActivityManager.LOCK_TASK_MODE_LOCKED) {
                android.util.Log.d("LoinLockManager", "Android lock task mode is active");
                return;
            }
            try {
                activity.startLockTask();
                android.util.Log.d("LoinLockManager", "Requested Android lock task mode");
            } catch (IllegalStateException e) {
                android.util.Log.w("LoinLockManager", "Lock task request deferred: " + e.getMessage());
            }
            handler.postDelayed(retry[0], 250);
        };
        handler.post(retry[0]);
        return true;
    }

    private void enableStatusBarLockdown() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
            DevicePolicyManager policy = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            if (policy != null) {
                try {
                    policy.setStatusBarDisabled(
                        new ComponentName(context, LockInDeviceAdminReceiver.class),
                        true
                    );
                } catch (SecurityException e) {
                    android.util.Log.w("LoinLockManager", "Unable to disable status bar: " + e.getMessage());
                }
            }
        }

    private void disableStatusBar() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
            DevicePolicyManager policy = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            if (policy != null) {
                try {
                    policy.setStatusBarDisabled(
                        new ComponentName(context, LockInDeviceAdminReceiver.class),
                        false
                    );
                } catch (SecurityException e) {
                    android.util.Log.w("LoinLockManager", "Unable to restore status bar: " + e.getMessage());
            }
        }
    }

    private void clearLockTaskPackages() {
            DevicePolicyManager policy =
                (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            if (policy == null) return;
            try {
                policy.setLockTaskPackages(
                    new ComponentName(context, LockInDeviceAdminReceiver.class),
                    new String[0]
                );
            } catch (SecurityException e) {
                android.util.Log.w("LoinLockManager", "Unable to clear lock task packages: " + e.getMessage());
        }
    }

    /** Called by the timer receiver or activity resume; only an elapsed native timer may auto-unlock. */
    public void completeExpiredSession(Activity activity) {
        if (!isActive()) return;
        long endAt = prefs.getLong(END_AT, 0L);
        if (prefs.getBoolean(HAS_TIMER, false) && endAt > 0L && System.currentTimeMillis() >= endAt) stop(activity);
    }

    public Set<String> getWhitelist() {
        return new HashSet<>(prefs.getStringSet(WHITELIST, new HashSet<>()));
    }

    private void scheduleExpiry(long endAt, boolean hasTimer) {
        cancelExpiry();
        if (!hasTimer || endAt <= 0L) return;
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            20,
            new Intent(context, LockInSessionAlarmReceiver.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pending);
    }

    private void cancelExpiry() {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            20,
            new Intent(context, LockInSessionAlarmReceiver.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarms.cancel(pending);
    }

    public SharedPreferences getPreferences() {
        return prefs;
    }
}
