const {KeyValueDao} = require('./index')
const { createStore } = require('./keyValueStore')

async function test(){
  // create a keyValue Store, it could also go to redis or memcached,... now it will only store in memory and save a file.
  const store = createStore();

  // define a collection with schema and the needed indexes.
  const userDao = new KeyValueDao({
    name: 'user',
    schema: {
      name: 'string',
      email: 'string',
    },
    indexes: {
      name: {},
      email: { unique: true },
    },
    store,
  });

  // insert items
  const user1 = await userDao.save({
    name: 'tobias nickel',
    email: "tobias.t.nickel@pwc.com"
  });
  const user2 = await userDao.save({
    name: 'Jason',
    email: "Jason@company.example.de"
  });
  
  console.log(userDao)
  console.log()
  console.log(store.data)
  
  // find a user by email, just as you would do when login a user
  const user1Loaded = await userDao.getByEmail('tobias.t.nickel@pwc.com');
  console.log({user1Loaded});
  
  // update a user (now with uppercase)
  user1Loaded.name = 'Tobias Nickel';
  await userDao.save(user1Loaded);
  console.log('storeAfterUpdate:', store.data)
  
  
}

test().catch(err=>console.log(err));