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
import android.view.View;
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
    private boolean pickerIsImage;
    private String exportContent;
    private static final int PHOTO = 201, EXPORT = 202;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xfff7f5ef);
        getWindow().setNavigationBarColor(0xfff7f5ef);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
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
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !"https://memorystring.local/MemoryString.html".equals(request.getUrl().toString()); }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && "memorystring.local".equals(uri.getHost())) {
                    String name = uri.getPath().substring(1);
                    if (name.equals("MemoryString.html") || (name.startsWith("app-assets/") && !name.contains("..") && name.matches("[A-Za-z0-9/_\\-.]+"))) {
                        try {
                            String mime = name.endsWith(".html") ? "text/html" : name.endsWith(".png") ? "image/png" : name.endsWith(".svg") ? "image/svg+xml" : name.endsWith(".woff2") ? "font/woff2" : "application/octet-stream";
                            java.util.Map<String,String> headers = new java.util.HashMap<>();
                            headers.put("Cache-Control", "no-store");
                            headers.put("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; worker-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'");
                            return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, getAssets().open(name));
                        } catch (Exception ignored) {}
                    }
                }
                if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
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
                pickerIsImage = image;
                // Providers can label .json as text/plain or octet-stream. The app validates its contents.
                i.setType(image ? "image/*" : "*/*");
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
        web.loadUrl("https://memorystring.local/MemoryString.html");
    }
    private void speechResult(String id, boolean ok) {
        if (id == null || !id.matches("[0-9]{1,12}")) return;
        runOnUiThread(() -> web.evaluateJavascript("window.msNativeDone && window.msNativeDone(" + JSONObject.quote(id) + "," + ok + ")", null));
    }
    private void showError(String text) {
        runOnUiThread(() -> web.evaluateJavascript("toast(" + JSONObject.quote(text) + ")", null));
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
        @JavascriptInterface public void openSpeechSettings() { runOnUiThread(() -> { try { startActivity(new Intent("com.android.settings.TTS_SETTINGS")); } catch (Exception e) { showError("Open Settings and find Text-to-speech."); } }); }
        @JavascriptInterface public void openSupportMail() { runOnUiThread(() -> { try { startActivity(new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:info@pinet.lt"))); } catch (Exception e) { showError("Contact info@pinet.lt for support."); } }); }
        @JavascriptInterface public void exportFile(String content, String filename) {
            if (content == null || content.length() > 400000 || filename == null || !filename.matches("MemoryString-[A-Za-z0-9-]{1,30}\\.json")) return;
            runOnUiThread(() -> {
                if (exportContent != null) { showError("Finish the previous file export first."); return; }
                exportContent = content;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
                i.putExtra(Intent.EXTRA_TITLE, filename);
                try { startActivityForResult(i, EXPORT); }
                catch (Exception e) { exportContent = null; exportResult(false, false); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        Uri selected = selectedDocument(data);
        if (request == PHOTO && picker != null) {
            boolean importJson = !pickerIsImage && result == RESULT_OK && selected != null;
            picker.onReceiveValue(!importJson && result == RESULT_OK && selected != null ? new Uri[]{selected} : null);
            picker = null;
            if (importJson) importDocument(selected);
        }
        if (request == EXPORT) {
            boolean ok = false;
            try { if (result == RESULT_OK && selected != null && exportContent != null) {
                try (OutputStream output = getContentResolver().openOutputStream(selected)) { if (output == null) throw new java.io.IOException(); output.write(exportContent.getBytes(StandardCharsets.UTF_8)); }
                ok = true;
            }} catch (Exception ignored) {}
            finally { exportContent = null; exportResult(ok, result != RESULT_OK); }
        }
    }
    private static Uri selectedDocument(Intent data) {
        if (data == null) return null;
        if (data.getData() != null) return data.getData();
        if (data.getClipData() != null && data.getClipData().getItemCount() > 0) return data.getClipData().getItemAt(0).getUri();
        return null;
    }
    private void importDocument(Uri uri) {
        // Read only the explicitly granted document, independently of stale provider size metadata.
        new Thread(() -> {
            try (InputStream input = getContentResolver().openInputStream(uri); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                if (input == null) throw new java.io.IOException();
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) {
                    if (bytes.size() + count > 400000) throw new java.io.IOException("Choose a MemoryString JSON backup up to 400 KB.");
                    bytes.write(buffer, 0, count);
                }
                String text = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
                runOnUiThread(() -> { if (!isFinishing() && !isDestroyed()) web.evaluateJavascript("window.msImportJson && window.msImportJson(" + JSONObject.quote(text) + ")", null); });
            } catch (Exception e) {
                String message = "Choose a MemoryString JSON backup up to 400 KB. The selected document could not be read.";
                runOnUiThread(() -> { if (!isFinishing() && !isDestroyed()) web.evaluateJavascript("window.msImportError && window.msImportError(" + JSONObject.quote(message) + ")", null); });
            }
        }, "MemoryString-document-import").start();
    }
    private void exportResult(boolean ok, boolean cancelled) { runOnUiThread(() -> web.evaluateJavascript("window.msExportResult && window.msExportResult(" + ok + "," + cancelled + ")", null)); }
    @Override protected void onPause() { super.onPause(); web.evaluateJavascript("window.msPause && window.msPause()", null); if (tts != null) tts.stop(); getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); }
    private void handleBack() { web.evaluateJavascript("window.msHandleBack ? window.msHandleBack() : false", value -> { if (!"true".equals(value)) finish(); }); }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onDestroy() { if (tts != null) { tts.stop(); tts.shutdown(); } web.removeJavascriptInterface("AndroidVoice"); web.destroy(); super.onDestroy(); }
}
