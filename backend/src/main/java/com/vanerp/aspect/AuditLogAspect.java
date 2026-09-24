package com.vanerp.aspect;

import com.vanerp.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * يسجّل تلقائياً كل عملية تعديل ناجحة (POST/PUT/PATCH/DELETE) على أي شاشة تحكم (Controller)
 * في سجل التدقيق (من قام بماذا ومتى)، دون الحاجة لتعديل منطق كل خدمة على حدة.
 * Automatically records every successful mutating request (POST/PUT/PATCH/DELETE) across all
 * controllers into the audit log — who did what and when — without touching individual services.
 */
@Aspect
@Component
@RequiredArgsConstructor
public class AuditLogAspect {

    private final AuditLogService auditLogService;

    @Pointcut("within(com.vanerp.controller..*) && "
            + "(@annotation(org.springframework.web.bind.annotation.PostMapping) "
            + "|| @annotation(org.springframework.web.bind.annotation.PutMapping) "
            + "|| @annotation(org.springframework.web.bind.annotation.DeleteMapping) "
            + "|| @annotation(org.springframework.web.bind.annotation.PatchMapping))")
    public void mutatingEndpoint() {
    }

    @AfterReturning("mutatingEndpoint()")
    public void logAfterSuccess(JoinPoint joinPoint) {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return;
            HttpServletRequest request = attrs.getRequest();
            String httpMethod = request.getMethod();
            String path = request.getRequestURI();

            String controllerName = joinPoint.getTarget().getClass().getSimpleName().replace("Controller", "");
            String action = resolveAction(httpMethod, path);
            String description = controllerName + "." + joinPoint.getSignature().getName() + " — " + httpMethod + " " + path;

            String explicitUsername = "LOGIN".equals(action) ? extractUsername(joinPoint.getArgs()) : null;

            auditLogService.record(httpMethod, action, controllerName, path, description, explicitUsername);
        } catch (Exception ignored) {
            // لا يجب أن يتسبب تسجيل التدقيق في فشل الطلب الأصلي
        }
    }

    private String resolveAction(String httpMethod, String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith("/login")) return "LOGIN";
        if (lower.contains("/change-password")) return "PASSWORD_CHANGE";
        if (lower.contains("/reset-password")) return "RESET_PASSWORD";
        if (lower.contains("/cancel")) return "CANCEL";
        if (lower.contains("/confirm")) return "CONFIRM";
        if (lower.contains("/return")) return "RETURN";
        if (lower.contains("/compensate")) return "COMPENSATE";
        if (lower.contains("/payments")) return "PAYMENT";
        return switch (httpMethod) {
            case "POST" -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            default -> httpMethod;
        };
    }

    private String extractUsername(Object[] args) {
        for (Object arg : args) {
            if (arg == null) continue;
            try {
                Object value = arg.getClass().getMethod("username").invoke(arg);
                if (value instanceof String s && !s.isBlank()) return s;
            } catch (ReflectiveOperationException ignored) {
                // المعامل لا يحتوي على حقل username بهذا الاسم
            }
        }
        return null;
    }
}
