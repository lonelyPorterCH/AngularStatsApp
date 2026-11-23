package ch.lonelyporter.statsapp.web;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SpaControllerTest {
    @Test
    void forwardsClientRoutesButNotStaticAssetsOrOtherMethods() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new SpaController()).build();

        mvc.perform(get("/stats"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
        mvc.perform(get("/stats/123/edit"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
        mvc.perform(get("/assets/main.js"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/stats"))
                .andExpect(status().isMethodNotAllowed());
    }
}
