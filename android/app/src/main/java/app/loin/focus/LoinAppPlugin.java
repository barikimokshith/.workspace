package app.loin.focus;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LoinApp")
public class LoinAppPlugin extends Plugin {
    private LoinLockManager lockManager;

    @Override
    public void load() {
        lockManager = new LoinLockManager(getContext());
    }

    public void notifyBackButton() {
        notifyListeners("backButton", new JSObject());
    }

    public void notifyUrlOpen(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        JSObject data = new JSObject();
        data.put("url", intent.getData().toString());
        notifyListeners("appUrlOpen", data);
    }

    public void restoreLock() {
        if (lockManager != null) {
            lockManager.completeExpiredSession(getActivity());
            lockManager.restore(getActivity());
        }
    }

    public boolean isLocked() {
        return lockManager != null && lockManager.isActive();
    }

    @PluginMethod
    public void getLockState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("active", lockManager.isActive());
        result.put("deviceOwner", lockManager.isDeviceOwner());
        result.put("sessionId", lockManager.getPreferences().getString("sessionId", ""));
        result.put("goal", lockManager.getPreferences().getString("goal", ""));
        result.put("startedAt", lockManager.getPreferences().getLong("startedAt", 0L));
        result.put("hasTimer", lockManager.getPreferences().getBoolean("hasTimer", false));
        result.put("endAt", lockManager.getPreferences().getLong("endAt", 0L));
        com.getcapacitor.JSArray whitelist = new com.getcapacitor.JSArray();
        for (String packageName : lockManager.getWhitelist()) whitelist.put(packageName);
        result.put("whitelist", whitelist);
        call.resolve(result);
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        PackageManager packages = getContext().getPackageManager();
        Intent launcher = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ApplicationInfo> apps = new ArrayList<>();
        Set<String> seen = new java.util.HashSet<>();
        for (android.content.pm.ResolveInfo info : packages.queryIntentActivities(launcher, 0)) {
            ApplicationInfo app = info.activityInfo.applicationInfo;
            if (!app.packageName.equals(getContext().getPackageName()) && seen.add(app.packageName)) apps.add(app);
        }
        java.util.Collections.sort(apps, (a, b) -> packages.getApplicationLabel(a).toString().compareToIgnoreCase(packages.getApplicationLabel(b).toString()));
        com.getcapacitor.JSArray result = new com.getcapacitor.JSArray();
        for (ApplicationInfo app : apps) {
            JSObject item = new JSObject();
            item.put("packageName", app.packageName);
            item.put("appName", packages.getApplicationLabel(app).toString());
            item.put("launchable", true);
            item.put("icon", iconData(packages.getApplicationIcon(app)));
            result.put(item);
        }
        JSObject response = new JSObject();
        response.put("apps", result);
        call.resolve(response);
    }

    @PluginMethod
    public void startLockSession(PluginCall call) {
        android.util.Log.d("LoinAppPlugin", "startLockSession called");
        String sessionId = call.getString("sessionId");
        String goal = call.getString("goal", "");
        long startedAt = call.getLong("startedAt", 0L);
        long endAt = call.getLong("endAt", 0L);
        boolean hasTimer = call.getBoolean("hasTimer", false);
        com.getcapacitor.JSArray values = call.getArray("whitelist");
        Set<String> whitelist = new java.util.HashSet<>();
        if (values != null) for (int i = 0; i < values.length(); i++) whitelist.add(values.optString(i));
        
        android.util.Log.d("LoinAppPlugin", "Parameters: sessionId=" + sessionId + ", goal=" + goal + ", hasTimer=" + hasTimer + ", whitelist size=" + whitelist.size());
        
        if (!lockManager.start(getActivity(), sessionId, goal, startedAt, endAt, hasTimer, whitelist)) {
            android.util.Log.e("LoinAppPlugin", "LockManager.start returned false");
            call.reject("Android could not enter kiosk lock mode. Please verify this app is provisioned as the device owner.");
            return;
        }
        android.util.Log.d("LoinAppPlugin", "Lock session started successfully");
        call.resolve();
    }

    @PluginMethod
    public void stopLockSession(PluginCall call) {
        android.util.Log.d("LoinAppPlugin", "stopLockSession called");
        lockManager.stop(getActivity());
        android.util.Log.d("LoinAppPlugin", "Lock session stopped successfully");
        call.resolve();
    }

    @PluginMethod
    public void launchWhitelistedApp(PluginCall call) {
        android.util.Log.d("LoinAppPlugin", "launchWhitelistedApp called");
        String packageName = call.getString("packageName");
        android.util.Log.d("LoinAppPlugin", "Attempting to launch: " + packageName);
        
        if (packageName == null || !lockManager.isActive() || !lockManager.getWhitelist().contains(packageName)) {
            android.util.Log.e("LoinAppPlugin", "App not allowed: active=" + lockManager.isActive() + ", inWhitelist=" + lockManager.getWhitelist().contains(packageName));
            call.reject("This app is not allowed during the current LockIn session.");
            return;
        }
        
        android.util.Log.d("LoinAppPlugin", "Checking if package is installed: " + packageName);
        Intent launch = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
        if (launch == null) {
            android.util.Log.e("LoinAppPlugin", "Launch intent is null for package: " + packageName);
            call.reject("This allowed app is no longer installed.");
            return;
        }
        
        android.util.Log.d("LoinAppPlugin", "Launch intent found, package: " + launch.getPackage());
        
        // Use Activity context instead of application context
        android.app.Activity activity = getActivity();
        if (activity == null) {
            android.util.Log.e("LoinAppPlugin", "Activity is null, cannot launch app");
            call.reject("Activity not available to launch app");
            return;
        }
        
        // The package was added to DevicePolicyManager's lock-task allow-list
        // before the session started. Do not stop Lock Task here: doing so
        // briefly restores Home/Recents and defeats the native restriction.
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        
        android.util.Log.d("LoinAppPlugin", "Starting activity with intent: " + launch);
        try {
            activity.startActivity(launch);
            android.util.Log.d("LoinAppPlugin", "App launched successfully");
            
            call.resolve();
        } catch (Exception e) {
            android.util.Log.e("LoinAppPlugin", "Failed to launch app: " + e.getMessage());
            android.util.Log.e("LoinAppPlugin", "Stack trace:", e);
            
            call.reject("Failed to launch app: " + e.getMessage());
        }
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        getActivity().finishAndRemoveTask();
        call.resolve();
    }

    private String iconData(Drawable drawable) {
        int size = 64;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        drawable.setBounds(0, 0, size, size);
        drawable.draw(new Canvas(bitmap));
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 80, output);
        return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
    }
}
