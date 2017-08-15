# Develop and Deploy

## Development ReadMe
1. Replace Tabletop with [SheetJS](https://github.com/SheetJS/js-xlsx) to manipulate Excel file.
2. You can drag&drop or click to choose the Excel file you want to use. Both operations are supported in a rectangle area.
3. Most changes are in src/util/factory.js. FYI, this [github repo](https://github.com/amareknight/build-your-own-radar) is in sync with the source code I uploaded.

## How to deploy
1. Download the source code, you'll find a Dockerfile in the folder. Run _"docker build -t radarapp:demo ."_ to build the image.
2. Once you build the image successfully, you can run _"docker run -p 8080:8080 radarapp:demo"_ to start the container and the app server will be started automatically.