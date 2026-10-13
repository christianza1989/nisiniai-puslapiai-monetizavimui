package lt.pinet.memorystring.demo;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/** Local creator app. No INTERNET, microphone, broad storage or camera permission. */
public final class MainActivity extends Activity {
    private WebView web;
    private TextToSpeech tts;
    private volatile boolean voiceReady;
    private ValueCallback<Uri[]> picker;
    private String exportContent;
    private static final int PHOTO = 201, EXPORT = 202;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xff164d40);
        getWindow().setNavigationBarColor(0xff164d40);
        web = new WebView(this);
        FrameLayout root = new FrameLayout(this);
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        root.requestApplyInsets();
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setTextZoom(Math.round(100 * getResources().getConfiguration().fontScale));
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setSupportMultipleWindows(false);
        web.addJavascriptInterface(new VoiceBridge(), "AndroidVoice");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String scheme = request.getUrl().getScheme();
                if ("http".equals(scheme) || "https".equals(scheme))
                    return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
                return super.shouldInterceptRequest(view, request);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (picker != null) picker.onReceiveValue(null);
                picker = callback;
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
                String[] types = params.getAcceptTypes();
                boolean image = types != null && java.util.Arrays.stream(types).anyMatch(t -> t.startsWith("image/"));
                i.setType(image ? "image/*" : "application/json");
                if (image) i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png", "image/webp"});
                try { startActivityForResult(i, PHOTO); }
                catch (Exception e) { picker.onReceiveValue(null); picker = null; }
                return true;
            }
        });
        tts = new TextToSpeech(this, code -> {
            voiceReady = code == TextToSpeech.SUCCESS;
            if (voiceReady) tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                public void onStart(String id) {}
                public void onDone(String id) { speechResult(id, true); }
                @Deprecated public void onError(String id) { speechResult(id, false); }
                public void onError(String id, int error) { speechResult(id, false); }
            });
            runOnUiThread(() -> web.evaluateJavascript("window.msNativeReady && window.msNativeReady()", null));
        });
        try (InputStream input = getAssets().open("MemoryString.html")) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
            String html = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            web.loadDataWithBaseURL("https://memorystring.local/", html, "text/html", "UTF-8", null);
        } catch (Exception e) { web.loadData("<p>App file not found.</p>", "text/html", "UTF-8"); }
    }
    private void speechResult(String id, boolean ok) {
        if (id == null || !id.matches("[0-9]{1,12}")) return;
        runOnUiThread(() -> web.evaluateJavascript("window.msNativeDone && window.msNativeDone(" + JSONObject.quote(id) + "," + ok + ")", null));
    }
    private void showError(String text) {
        runOnUiThread(() -> web.evaluateJavascript("document.getElementById('error').hidden=false;document.getElementById('error').textContent=" + JSONObject.quote(text), null));
    }
    public final class VoiceBridge {
        @JavascriptInterface public String voices() {
            JSONArray out = new JSONArray();
            if (!voiceReady || tts.getVoices() == null) return out.toString();
            for (Voice voice : tts.getVoices()) {
                if (voice.getFeatures() != null && voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                try { JSONObject v = new JSONObject(); v.put("name", voice.getName()); v.put("lang", voice.getLocale().toLanguageTag()); v.put("label", voice.getLocale().getDisplayName(java.util.Locale.ENGLISH)); v.put("default", tts.getDefaultVoice() != null && voice.getName().equals(tts.getDefaultVoice().getName())); v.put("network", voice.isNetworkConnectionRequired()); out.put(v); }
                catch (Exception ignored) {}
            }
            return out.toString();
        }
        @JavascriptInterface public void speak(String text, String name, double rate, String id) {
            if (text == null || text.length() > 400 || id == null || !id.matches("[0-9]{1,12}")) return;
            runOnUiThread(() -> {
                if (!voiceReady || tts.getVoices() == null) { speechResult(id, false); return; }
                Voice selected = null;
                for (Voice voice : tts.getVoices()) if (voice.getName().equals(name) && !voice.isNetworkConnectionRequired() && (voice.getFeatures() == null || !voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))) selected = voice;
                if (selected == null) { speechResult(id, false); return; }
                tts.setVoice(selected);
                tts.setSpeechRate((float)Math.max(.7, Math.min(1.3, rate)));
                if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), id) == TextToSpeech.ERROR) speechResult(id, false);
            });
        }
        @JavascriptInterface public void stop() { runOnUiThread(() -> { if (tts != null) tts.stop(); }); }
        @JavascriptInterface public void keepAwake(boolean on) { runOnUiThread(() -> { if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); }); }
        @JavascriptInterface public void exportFile(String content, String filename) {
            if (content == null || content.length() > 400000 || filename == null || !filename.matches("MemoryString-[A-Za-z0-9-]{1,30}\\.json")) return;
            runOnUiThread(() -> {
                if (exportContent != null) { showError("Finish the previous file export first."); return; }
                exportContent = content;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
                i.putExtra(Intent.EXTRA_TITLE, filename);
                try { startActivityForResult(i, EXPORT); }
                catch (Exception e) { exportContent = null; showError("Could not open the file picker."); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PHOTO && picker != null) { picker.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null); picker = null; }
        if (request == EXPORT) {
            try { if (result == RESULT_OK && data != null && data.getData() != null && exportContent != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData())) { if (output == null) throw new java.io.IOException(); output.write(exportContent.getBytes(StandardCharsets.UTF_8)); }
            }} catch (Exception e) { showError("Export failed. Choose another file location."); }
            finally { exportContent = null; }
        }
    }
    @Override protected void onPause() { super.onPause(); web.evaluateJavascript("document.dispatchEvent(new Event('visibilitychange'));", null); web.evaluateJavascript("document.getElementById('auto').textContent.includes('Pause') && document.getElementById('auto').click()", null); if (tts != null) tts.stop(); getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); }
    private void handleBack() { web.evaluateJavascript("window.msHandleBack ? window.msHandleBack() : false", value -> { if (!"true".equals(value)) finish(); }); }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onDestroy() { if (tts != null) { tts.stop(); tts.shutdown(); } web.removeJavascriptInterface("AndroidVoice"); web.destroy(); super.onDestroy(); }
}
