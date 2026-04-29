package ch.lonelyporter.statsapp.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

/**
 * When calling the URL manually we get a 404 from springboot, angular only works if the url localhost:8081 is directly
 * called. This is supposed to mitigate this, but didn't work...
 */
@Controller
public class SpaController {

    @RequestMapping(value = "/{path:[^.]*}", method = RequestMethod.GET)
    public String redirect(@PathVariable String path) {
        return "forward:/index.html";
    }
}
