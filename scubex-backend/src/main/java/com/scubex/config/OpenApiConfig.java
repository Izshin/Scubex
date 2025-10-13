package com.scubex.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI scubexOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Scubex API")
                        .description("Marine species discovery API for scuba diving social media app")
                        .version("v1.0")
                        .contact(new Contact()
                                .name("Scubex Team")
                                .email("contact@scubex.com")));
    }
}