package app.loin.focus;

import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.window.OnBackInvokedDispatcher;
import android.view.KeyEvent;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import com.getcapacitor.WebViewListener;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private boolean isLocked = false;
	private View launchCover;
	
	@Override
	public void onCreate(Bundle savedInstanceState) {
		registerPlugin(LoinHttpPlugin.class);
		registerPlugin(LoinAppPlugin.class);
		super.onCreate(savedInstanceState);
		if (bridge != null) {
			bridge.getWebView().setAlpha(0f);
		}
		showLaunchCover();
		if (bridge != null) {
			bridge.addWebViewListener(new WebViewListener() {
				@Override
				public void onPageLoaded(android.webkit.WebView webView) {
					webView.setAlpha(1f);
					removeLaunchCover();
				}
			});
		}
		if (bridge != null && bridge.getPlugin("LoinApp") != null) {
			((LoinAppPlugin) bridge.getPlugin("LoinApp").getInstance()).restoreLock();
		}

		if (Build.VERSION.SDK_INT >= 33) {
			getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
				OnBackInvokedDispatcher.PRIORITY_DEFAULT,
				this::dispatchBack
			);
		}
	}

	private void showLaunchCover() {
		FrameLayout cover = new FrameLayout(this);
		cover.setBackgroundColor(android.graphics.Color.rgb(11, 13, 12));
		ImageView lock = new ImageView(this);
		lock.setImageResource(app.loin.focus.R.drawable.loin_lock_logo);
		lock.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
		FrameLayout.LayoutParams lockParams = new FrameLayout.LayoutParams(180, 180, Gravity.CENTER);
		cover.addView(lock, lockParams);
		addContentView(cover, new ViewGroup.LayoutParams(
			ViewGroup.LayoutParams.MATCH_PARENT,
			ViewGroup.LayoutParams.MATCH_PARENT
		));
		launchCover = cover;
	}

	private void removeLaunchCover() {
		runOnUiThread(() -> {
			if (launchCover != null && launchCover.getParent() instanceof ViewGroup) {
				((ViewGroup) launchCover.getParent()).removeView(launchCover);
				launchCover = null;
			}
		});
	}

	@Override
	public void onBackPressed() {
		dispatchBack();
	}

	private void dispatchBack() {
		// Check if locked - if so, block back button completely
		if (bridge != null && bridge.getPlugin("LoinApp") != null) {
			LoinAppPlugin app = (LoinAppPlugin) bridge.getPlugin("LoinApp").getInstance();
			if (app.isLocked()) {
				android.util.Log.d("MainActivity", "Back button blocked - device is locked");
				return; // Block back button when locked
			}
			app.notifyBackButton();
		} else {
			super.onBackPressed();
		}
	}
	
	@Override
	public boolean onKeyDown(int keyCode, KeyEvent event) {
		// Block system keys when locked
		if (bridge != null && bridge.getPlugin("LoinApp") != null) {
			LoinAppPlugin app = (LoinAppPlugin) bridge.getPlugin("LoinApp").getInstance();
			if (app.isLocked()) {
				// Block home button (KEYCODE_HOME = 3)
				if (keyCode == KeyEvent.KEYCODE_HOME) {
					android.util.Log.d("MainActivity", "Home button blocked - device is locked");
					return true;
				}
				// Block recent apps (KEYCODE_APP_SWITCH = 187)
				if (keyCode == KeyEvent.KEYCODE_APP_SWITCH) {
					android.util.Log.d("MainActivity", "Recent apps button blocked - device is locked");
					return true;
				}
				// Block menu button (KEYCODE_MENU = 82)
				if (keyCode == KeyEvent.KEYCODE_MENU) {
					android.util.Log.d("MainActivity", "Menu button blocked - device is locked");
					return true;
				}
			}
		}
		return super.onKeyDown(keyCode, event);
	}

	@Override
	public void onNewIntent(Intent intent) {
		super.onNewIntent(intent);
		if (bridge != null && bridge.getPlugin("LoinApp") != null) {
			((LoinAppPlugin) bridge.getPlugin("LoinApp").getInstance()).notifyUrlOpen(intent);
		}
	}

	@Override
	public void onResume() {
		super.onResume();
		applyLockdownSystemUi();
		if (bridge != null && bridge.getPlugin("LoinApp") != null) {
			LoinAppPlugin app = (LoinAppPlugin) bridge.getPlugin("LoinApp").getInstance();
			app.restoreLock();
		}
	}

	@Override
	public void onWindowFocusChanged(boolean hasFocus) {
		super.onWindowFocusChanged(hasFocus);
		if (hasFocus && bridge != null && bridge.getPlugin("LoinApp") != null) {
			LoinAppPlugin app = (LoinAppPlugin) bridge.getPlugin("LoinApp").getInstance();
			if (app.isLocked()) app.restoreLock();
			applyLockdownSystemUi();
		}
	}

	@Override
	public void onUserLeaveHint() {
		super.onUserLeaveHint();
		if (bridge != null && bridge.getPlugin("LoinApp") != null) {
			LoinAppPlugin app = (LoinAppPlugin) bridge.getPlugin("LoinApp").getInstance();
			if (app.isLocked()) {
				app.restoreLock();
				applyLockdownSystemUi();
			}
		}
	}

	private void applyLockdownSystemUi() {
		if (bridge == null || bridge.getPlugin("LoinApp") == null) {
			return;
		}
		LoinAppPlugin app = (LoinAppPlugin) bridge.getPlugin("LoinApp").getInstance();
		if (!app.isLocked()) {
			getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
				getWindow().setDecorFitsSystemWindows(true);
			}
			return;
		}

		int flags = View.SYSTEM_UI_FLAG_FULLSCREEN
			| View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
			| View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
			| View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
			| View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
			| View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
		getWindow().getDecorView().setSystemUiVisibility(flags);
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
			getWindow().setDecorFitsSystemWindows(false);
			if (getWindow().getInsetsController() != null) {
				getWindow().getInsetsController().hide(android.view.WindowInsets.Type.systemBars());
				getWindow().getInsetsController().setSystemBarsBehavior(
					android.view.WindowInsetsController.BEHAVIOR_DEFAULT
				);
			}
		}
	}
	
}
