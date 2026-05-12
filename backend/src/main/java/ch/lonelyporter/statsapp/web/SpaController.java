package ch.lonelyporter.statsapp.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

/**
 * Forwards all non-API, non-static-asset GET requests to index.html so that
 * Angular's client-side router handles them. This makes hard refreshes and
 * direct URL navigation work correctly in production.
 *
 * Two patterns are needed:
 *   - "/{path:[^.]*}"          – top-level paths (e.g. /stats)
 *   - "/**/{path:[^.]*}"       – nested paths (e.g. /stats/123/edit)
 * The [^.]* regex excludes paths that contain a dot so that static assets
 * (.js, .css, .ico, …) are still served by the resource handler, not forwarded.
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
