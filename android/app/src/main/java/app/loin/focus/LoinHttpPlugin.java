package app.loin.focus;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.webkit.CookieManager;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

@CapacitorPlugin(name = "LoinHttp")
public class LoinHttpPlugin extends Plugin {
    @PluginMethod
    public void request(PluginCall call) {
        String urlValue = call.getString("url");
        String method = call.getString("method", "GET");
        String body = call.getString("data");
        JSObject headerObject = call.getObject("headers");

        if (urlValue == null || urlValue.isEmpty()) {
            call.reject("A request URL is required.");
            return;
        }

        new Thread(() -> {
            try {
            HttpURLConnection connection = (HttpURLConnection) new URL(urlValue).openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(120000);
            connection.setInstanceFollowRedirects(true);

            if (headerObject != null) {
                JSONObject headers = headerObject;
                java.util.Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    connection.setRequestProperty(key, headers.optString(key));
                }
            }

            if (connection.getRequestProperty("Cookie") == null) {
                String cookies = CookieManager.getInstance().getCookie(urlValue);
                if (cookies != null && !cookies.isEmpty()) connection.setRequestProperty("Cookie", cookies);
            }

            if (body != null && !body.isEmpty() && !method.equals("GET") && !method.equals("HEAD")) {
                connection.setDoOutput(true);
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(bytes);
                }
            }

            int status = connection.getResponseCode();
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            String responseBody = readBody(stream);
            JSObject response = new JSObject();
            response.put("status", status);
            response.put("url", connection.getURL().toString());
            response.put("data", responseBody);
            response.put("headers", responseHeaders(connection.getHeaderFields()));
            persistCookies(urlValue, connection.getHeaderFields());
            call.resolve(response);
            connection.disconnect();
        } catch (Exception error) {
            call.reject(error.getMessage() == null ? "Native HTTP request failed." : error.getMessage(), error);
        }
        }).start();
    }

    private void persistCookies(String urlValue, Map<String, List<String>> fields) {
        if (fields == null) return;
        List<String> setCookies = fields.get("Set-Cookie");
        if (setCookies == null) setCookies = fields.get("set-cookie");
        if (setCookies == null) return;
        CookieManager cookies = CookieManager.getInstance();
        for (String cookie : setCookies) cookies.setCookie(urlValue, cookie);
        cookies.flush();
    }

    private String readBody(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder result = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) result.append(line).append('\n');
        }
        return result.toString();
    }

    private JSObject responseHeaders(Map<String, List<String>> fields) {
        JSObject result = new JSObject();
        if (fields == null) return result;
        for (Map.Entry<String, List<String>> entry : fields.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                result.put(entry.getKey(), String.join(", ", entry.getValue()));
            }
        }
        return result;
    }
}
