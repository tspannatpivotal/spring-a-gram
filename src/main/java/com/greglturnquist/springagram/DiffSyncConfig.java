package com.greglturnquist.springagram;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.patch.diffsync.PersistenceCallbackRegistry;
import org.springframework.web.patch.diffsync.config.DiffSyncConfigurerAdapter;
import org.springframework.web.patch.diffsync.config.EnableDifferentialSynchronization;

@Configuration
@EnableDifferentialSynchronization
public class DiffSyncConfig extends DiffSyncConfigurerAdapter {

	@Autowired
	private ItemRepository itemRepository;
	
	@Override
	public void addPersistenceCallbacks(PersistenceCallbackRegistry registry) {
		registry.addPersistenceCallback(new JpaPersistenceCallback<Item>(itemRepository, Item.class));
	}
	
}
