package com.greglturnquist.springagram;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.io.IOException;

@Configuration
@EnableJpaRepositories
@Import(CustomizedRestMvcConfiguration.class)
@EnableAutoConfiguration
@ComponentScan
public class Application {

	public static void main(String[] args) throws IOException {
		SpringApplication.run(Application.class, args);
	}

}
