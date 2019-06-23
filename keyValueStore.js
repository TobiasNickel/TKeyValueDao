// example for an keyValueStore
const fs = require('fs');

function createStore (){
  const store = {
    data: {},
    
    /**
     * 
     * @param {String} key 
     */ 
    async get(key) {
      return typeof store.data[key] === 'undefined' ? undefined : JSON.parse(store.data[key]);
    },
    
    /**
     * 
     * @param {String} key 
     * @param {String} value 
     */
    async set(key, value) {
      store.data[key] = JSON.stringify(value);
    },
    
    /**
     * 
     * @param {String} file 
     */
    async storeToFile(file) {
      await fs.promises.writeFile(file, JSON.stringify(store.data));
    },
  };
  return store;
}

function createPrefixedStore(mainStore, prefix){
  const store = {
    mainStore,
    async get(key) {
      return await store.mainStore.get(prefix + key);
    },
    async set(key, value) {
      return await store.mainStore.set(prefix + key, value);
    }
  }
  return store;
}

exports.createStore = createStore;
exports.createPrefixedStore = createPrefixedStore;