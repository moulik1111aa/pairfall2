package com.pairfall.game;

import android.content.Context;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Map;

/**
 * Pairfall's bridge to the phone: haptics, the back button, full-screen display,
 * the highest refresh rate, keep-screen-on while playing, and a native mirror of
 * the save so progress survives even if the WebView's storage is cleared.
 * The web side lives in src/platform/native.ts.
 */
@CapacitorPlugin(name = "Pairfall")
public class PairfallPlugin extends Plugin {

    private static final String PREFS = "pairfall_save";
    private Vibrator vibrator;

    @Override
    public void load() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = vm != null ? vm.getDefaultVibrator() : null;
        } else {
            vibrator = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
        }

        AppCompatActivity activity = getActivity();
        activity.runOnUiThread(() -> {
            immersive();
            preferHighestRefreshRate();
            activity
                .getOnBackPressedDispatcher()
                .addCallback(
                    activity,
                    new OnBackPressedCallback(true) {
                        @Override
                        public void handleOnBackPressed() {
                            // The game decides (close a sheet, pause, go home, or leave).
                            if (hasListeners("back")) {
                                notifyListeners("back", new JSObject());
                            } else {
                                activity.moveTaskToBack(true);
                            }
                        }
                    }
                );
        });
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        immersive();
    }

    /** Hide the status and navigation bars; a swipe from the edge shows them briefly. */
    private void immersive() {
        Window window = getActivity().getWindow();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    /** Ask for the display's fastest mode at the current resolution (120 Hz on the OnePlus 13R). */
    private void preferHighestRefreshRate() {
        try {
            Window window = getActivity().getWindow();
            Display display = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? getActivity().getDisplay()
                : getActivity().getWindowManager().getDefaultDisplay();
            if (display == null) return;
            Display.Mode current = display.getMode();
            Display.Mode best = current;
            for (Display.Mode mode : display.getSupportedModes()) {
                boolean sameSize =
                    mode.getPhysicalWidth() == current.getPhysicalWidth() && mode.getPhysicalHeight() == current.getPhysicalHeight();
                if (sameSize && mode.getRefreshRate() > best.getRefreshRate()) best = mode;
            }
            WindowManager.LayoutParams params = window.getAttributes();
            params.preferredDisplayModeId = best.getModeId();
            params.preferredRefreshRate = best.getRefreshRate();
            window.setAttributes(params);
        } catch (Exception ignored) {
            // Leave the system default.
        }
    }

    @PluginMethod
    public void haptic(PluginCall call) {
        String kind = call.getString("kind", "tap");
        try {
            if (vibrator != null && vibrator.hasVibrator()) vibrate(kind);
        } catch (Exception ignored) {
            // Haptics are a nicety; never fail the call.
        }
        call.resolve();
    }

    private void vibrate(String kind) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            vibrator.vibrate(legacyMillis(kind));
            return;
        }
        VibrationEffect effect = effectFor(kind);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_MEDIA));
        } else {
            AudioAttributes audio = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).build();
            vibrator.vibrate(effect, audio);
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private VibrationEffect effectFor(String kind) {
        switch (kind) {
            case "match":
                return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    ? VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                    : VibrationEffect.createOneShot(14, 180);
            case "combo":
                return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    ? VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK)
                    : waveform(new long[] { 0, 14, 40, 22 }, new int[] { 0, 180, 0, 230 });
            case "heartbeat":
                return waveform(new long[] { 0, 18, 90, 26 }, new int[] { 0, 140, 0, 210 });
            case "win":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
                    vibrator.areAllPrimitivesSupported(
                        VibrationEffect.Composition.PRIMITIVE_SLOW_RISE,
                        VibrationEffect.Composition.PRIMITIVE_CLICK
                    )) {
                    return VibrationEffect.startComposition()
                        .addPrimitive(VibrationEffect.Composition.PRIMITIVE_SLOW_RISE, 0.7f)
                        .addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 1f, 60)
                        .addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 1f, 90)
                        .compose();
                }
                return waveform(new long[] { 0, 30, 60, 30, 60, 70 }, new int[] { 0, 150, 0, 170, 0, 255 });
            case "lose":
                return waveform(new long[] { 0, 90, 70, 140 }, new int[] { 0, 200, 0, 255 });
            case "tap":
            default:
                return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    ? VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                    : VibrationEffect.createOneShot(8, 90);
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private static VibrationEffect waveform(long[] timings, int[] amplitudes) {
        return VibrationEffect.createWaveform(timings, amplitudes, -1);
    }

    private static long legacyMillis(String kind) {
        switch (kind) {
            case "match":
            case "combo":
                return 16;
            case "heartbeat":
                return 30;
            case "win":
            case "lose":
                return 90;
            default:
                return 8;
        }
    }

    @PluginMethod
    public void keepAwake(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
        call.resolve();
    }

    @PluginMethod
    public void exit(PluginCall call) {
        call.resolve();
        getActivity().runOnUiThread(() -> getActivity().moveTaskToBack(true));
    }

    @PluginMethod
    public void readSave(PluginCall call) {
        JSObject values = new JSObject();
        for (Map.Entry<String, ?> entry : prefs().getAll().entrySet()) {
            if (entry.getValue() instanceof String) values.put(entry.getKey(), (String) entry.getValue());
        }
        JSObject result = new JSObject();
        result.put("values", values);
        call.resolve(result);
    }

    @PluginMethod
    public void writeSave(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("key and value are required");
            return;
        }
        prefs().edit().putString(key, value).apply();
        call.resolve();
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
