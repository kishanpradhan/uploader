## Requirements
mongodb >=3.6  
node >=8.9.4  
redis >=3.0.6  
rabbitmq >=3.6 (When using Queue)  
python >=3.6 (When using Queue)  N

## Installation
1. Install requirements
2. Install dependencies ```npm install```
3. Add ***settings.js*** file in the root directory
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
4. Create **result** directory in project root
5. Now run ```node server.js``` or for development run ```npm run dev```

Then go to [http://127.0.0.1:3001?user=username](http://127.0.0.1:3001?user=username) and try uploading file.

**Note**: You need to pass *user* parameter to define which user is uploading file as we are storing file in username directory.

## Functionalities
1. Upload new file.
   ![Select file to upload](https://github.com/kishanpradhan/uploader/blob/master/assets/List%20of%20files.png)
2. Uploading file. You can get the real time progress.
   ![Uploading file](https://github.com/kishanpradhan/uploader/blob/master/assets/Uploading%20File.png)
3. Pause, Resume or Cancel during upload
   ![Paused file, You can resume](https://github.com/kishanpradhan/uploader/blob/master/assets/Paused%20file.png)
4. If you come back to the page after refresh or after sometimes, you can see your file status.
   ![List of files with info](https://github.com/kishanpradhan/uploader/blob/master/assets/List%20of%20files.png)
5. You can resume the old file upload by uploading same file. It will resume from where it left.
   ![Resume by uploading same file again](https://github.com/kishanpradhan/uploader/blob/master/assets/Resume%20by%20uploading%20same%20file%20again.png)
**Note**: To resume after refresh, the file name must be same.
