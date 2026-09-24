package com.ceramicerp.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Map;

/**
 * يخدم الواجهة الأمامية (React SPA) من نفس السيرفر: أي مسار غير مطابق لملف ثابت أو نقطة API
 * يُعاد توجيهه إلى index.html ليتولى React Router عرض الصفحة الصحيحة على المتصفح.
 * أخطاء الـ API (المسارات التي تبدأ بـ /api) تبقى كما هي (JSON) ولا تُعاد توجيهها.
 */
@Controller
public class SpaWebController implements ErrorController {

    @RequestMapping("/error")
    public Object handleError(HttpServletRequest request) {
        Object uriAttr = request.getAttribute("jakarta.servlet.error.request_uri");
        String uri = uriAttr != null ? uriAttr.toString() : "";
        if (uri.startsWith("/api")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", 404, "message", "غير موجود"));
        }
        return "forward:/index.html";
    }
}
