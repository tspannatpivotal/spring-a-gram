package com.greglturnquist.springagram;

import java.util.List;

import org.springframework.data.repository.CrudRepository;
import org.springframework.web.patch.diffsync.PersistenceCallback;

class JpaPersistenceCallback<T> implements PersistenceCallback<T> {
	
	private final CrudRepository<T, Long> repo;
	private Class<T> entityType;

	public JpaPersistenceCallback(CrudRepository<T, Long> repo, Class<T> entityType) {
		this.repo = repo;
		this.entityType = entityType;
	}
	
	@Override
	public List<T> findAll() {
		System.out.println("FINDING ALL");
		List<T> allItems = (List<T>) repo.findAll();
		System.out.println("ALL ITEMS COUNT:  " + allItems);
		return allItems;
	}
	
	@Override
	public void persistChange(T itemToSave) {
		System.out.println("SAVING AN ITEM");
		repo.save(itemToSave);
	}
	
	@Override
	public void persistChanges(List<T> itemsToSave, List<T> itemsToDelete) {
		System.out.println("PERSISTING CHANGES");
		System.out.println("SAVING :  " + itemsToSave);
		System.out.println("DELETING:  " + itemsToDelete);
		repo.save(itemsToSave);
		repo.delete(itemsToDelete);
	}
	
	@Override
	public Class<T> getEntityType() {
		return entityType;
	}
	
}