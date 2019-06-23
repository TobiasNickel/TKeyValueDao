const { createStore, createPrefixedStore } = require('./keyValueStore');
const { struct } = require('superstruct');


class KeyValueDao {
  constructor (params) {
    this.indexes = {};
    this.store = createStore(),
    Object.assign(this, params);
    this.schema = {
      ...params.schema,
      _id: 'string',
    };
    this.validateSchema = struct(this.schema);

    if (typeof this.name !== 'string') {
      throw new Error('dao params require name');
    }

    this.indexes = {
      ...this.indexes,
      _id: {
        unique: true,
        autoGenerate: generateId
      },
    };
    Object.keys(this.indexes).forEach((name) => {
      if (!this.schema[name]) throw new Error(`field ${name} for index is not found in schema`);
      const indexOptions = {
        name,
        ...this.indexes[name],
      };
      this.indexes[name] = indexOptions;
      if (typeof indexOptions.store !== 'object') {
        indexOptions.store = createPrefixedStore(this.store, this.name + '_by_' + indexOptions.name + '_')
      }
      this._addGetMethod(indexOptions);
      
    });
    Object.freeze(this);
  }
  
  _addGetMethod(indexOptions) {
    const name = indexOptions.name;
    this['getBy' + name[0].toUpperCase() + name.substr(1)] = async (value) => {
      const keys = await indexOptions.store.get(value);
      if(Array.isArray(keys)) {
        return await Promise.all(keys.map(key => this.store.get(key)));
      }
      else {
        return await this.store.get(keys);
      }
    };
  }

  async save(item) {
    if(item._id){
      return await this.update(item);
    }else{
      return await this.insert(item);
    }
  }
  async insert(item){
    this._sanitizeItem(item);
    await this.store.set(this.name + '_' + item._id, item);
    await Promise.all(Object.keys(this.indexes).map(async (name) => {
      const indexOptions = this.indexes[name];
      await this._addToIndex(indexOptions,item,name);
    }));
    return item;
  }


  async update(item) {
    this._sanitizeItem(item);
    const existingItem = await this.store.get(this.name + '_' + item._id);
    if (!existingItem) return await this.insert(item);
    await this.store.set(this.name + '_' + item._id, item);
    await Promise.all(Object.keys(this.indexes).map(async (name) => {
      const newValue = item[name];
      const oldValue = existingItem[name];
      const indexOptions = this.indexes[name];
      
      if (oldValue != newValue) {
        await this._addToIndex(indexOptions, item, name);
        await this._removeFromIndex(indexOptions, existingItem, name);
      }
    }));
  }
  
  async _addToIndex(indexOptions, item, name) {
    if (item[name] === undefined) return;
    if (indexOptions.unique) {
      await indexOptions.store.set(item[name], this.name + '_' + item._id);
    } else {
      var existingList = await indexOptions.store.get(item[name]);
      console.log({
        existingList
      });
      const list = existingList || [];
      list.push(this.name + '_' + item._id);
      await indexOptions.store.set(item[name], list);
    }
  }
  async _removeFromIndex(indexOptions, item, name) {
    if (indexOptions.unique) {
      await indexOptions.store.set(item[name], undefined);
    } else {
      var existingList = await indexOptions.store.get(item[name]);
      console.log({
        existingList
      });
      const list = existingList || [];
      const index = list.indexOf(this.name + '_' + item._id);
      if (index === -1) return
      list.splice(index, 1)
      await indexOptions.store.set(item[name], list);
    }
  }
  _sanitizeItem(item) {
    Object.keys(this.indexes).forEach(name => {
      const indexOptions = this.indexes[name];
      if (indexOptions.autoGenerate) {
        if (!item[name]) {
          item[name] = indexOptions.autoGenerate();
        }
      }
    });
    this.validateSchema(item);
  }
  // todo: find all
}

function generateId() {
  return parseInt(Math.random() * 10000000000).toString(16) +
    parseInt(Math.random() * 10000000000).toString(16) +
    parseInt(Math.random() * 10000000000).toString(16) +
    parseInt(Math.random() * 10000000000).toString(16) +
    parseInt(Math.random() * 10000000000).toString(16) +
    parseInt(Math.random() * 10000000000).toString(16);
}

exports.KeyValueDao = KeyValueDao;