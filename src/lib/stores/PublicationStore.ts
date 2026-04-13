import { makeAutoObservable, runInAction } from 'mobx';
import { getPublications, createPublication, deletePublication, updatePublication, type PublicationData } from '../api';

class PublicationStore {
  publications: PublicationData[] = [];
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchPublications() {
    this.isLoading = true;
    this.error = null;

    try {
      const data = await getPublications();
      runInAction(() => {
        this.publications = data;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Error fetching publications';
        this.isLoading = false;
      });
    }
  }

  async addPublication(data: {
    title: string;
    description?: string;
    imageUrl?: string;
    latitude: number;
    longitude: number;
  }) {
    this.isLoading = true;
    this.error = null;

    try {
      const created = await createPublication(data);
      runInAction(() => {
        this.publications = [created, ...this.publications];
        this.isLoading = false;
      });
      return created;
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Error creating publication';
        this.isLoading = false;
      });
      return null;
    }
  }

  async removePublication(id: number) {
    try {
      await deletePublication(id);
      runInAction(() => {
        this.publications = this.publications.filter(p => p.id !== id);
      });
      return true;
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Error deleting publication';
      });
      return false;
    }
  }

  async editPublication(id: number, data: { title: string; description?: string; imageUrl?: string }) {
    try {
      const updated = await updatePublication(id, data);
      runInAction(() => {
        this.publications = this.publications.map(p => p.id === id ? updated : p);
      });
      return updated;
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Error updating publication';
      });
      return null;
    }
  }
}

export default PublicationStore;
