package ch.lonelyporter.statsapp.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

/**
 * Forwards all non-API, non-static-asset GET requests to {@code index.html} so
 * that Angular's client-side router (SPA = Single-Page Application) handles them.
 * This makes hard refreshes and direct URL navigation work correctly in production.
 *
 * <p>Two URL patterns are registered:</p>
 * <ul>
 *   <li><code>/{path:[^.]&#42;}</code>          – top-level paths, e.g. /stats</li>
 *   <li><code>/&#42;&#42;/{path:[^.]&#42;}</code> – nested paths, e.g. /stats/123/edit</li>
 * </ul>
 *
 * <p>The <code>[^.]&#42;</code> regex intentionally excludes segments that contain a dot,
 * so static assets (.js, .css, .ico, etc.) continue to be served by Spring's
 * resource handler and are never forwarded to {@code index.html}.</p>
 */
@Controller
public class SpaController {

    @RequestMapping(
            value = {"/{path:[^.]*}", "/**/{path:[^.]*}"},
            method = RequestMethod.GET
    )
    public String forward() {
        return "forward:/index.html";
    }
}
