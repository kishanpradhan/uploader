## Requirements
mongodb >=3.6  
node >=8.9.4  
redis >=3.0.6  
rabbitmq >=3.6 (When using Queue)  
python >=3.6 (When using Queue)  N

## Installation
1. Install requirements
2. Install dependencies ```npm install```
3. Add *settings.js* file in the root directory
  settings.js looks like
```
var exports = module.exports = {};

exports.DATABASES = [
	{
		"type": "mongo",
		"db": "uploader",
		"host": ["127.0.0.1"],
		"port": ["27017"],
		"user": "",
		"pwd": ""
	}
]

exports.CACHE = {
	"db": 0,
	"host": "127.0.0.1",
	"port": "6379",
	"pwd": "",
}

exports.CELERY = {
	BROKER_URL: "amqp://guest:guest@localhost:5672//"
}

```
4. Create *result* directory in project root
5. Now run ```node server.js``` or for development run ```npm run dev```

Then go to 127.0.0.1:8080 and try uploading file.
