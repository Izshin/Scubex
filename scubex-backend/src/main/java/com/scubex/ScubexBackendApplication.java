package com.scubex;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ScubexBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ScubexBackendApplication.class, args);
	}

}
