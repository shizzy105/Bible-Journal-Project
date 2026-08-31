package com.asornotes.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.BridgeActivity
import com.getcapacitor.BridgeWebChromeClient

class MainActivity : BridgeActivity() {
    private val RECORD_AUDIO_REQUEST_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Explicitly check and request RECORD_AUDIO runtime permission on Android startup
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                ),
                RECORD_AUDIO_REQUEST_CODE
            )
        }

        // 2. Grant WebView media permissions so getUserMedia works inside Capacitor WebView
        bridge?.webView?.webChromeClient = object : BridgeWebChromeClient(bridge) {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    // Check if request is for audio capture
                    val resources = request.resources
                    for (resource in resources) {
                        if (resource == PermissionRequest.RESOURCE_AUDIO_CAPTURE) {
                            request.grant(resources)
                            return@runOnUiThread
                        }
                    }
                    request.grant(resources)
                }
            }
        }
    }
}
