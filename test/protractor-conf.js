exports.config = {
    allScriptsTimeout: 11000,

    // uncomment below line and comment Line 6 to test actual web version
    //baseUrl: 'http://jz1371.github.io/PROJECT_Rummikub/app/',
    baseUrl: 'http://localhost:9000/app/',

    specs: [
        'e2e/*.js'
    ],

    capabilities: {
        'browserName': 'chrome'
    },

    directConnect: true, // only works with Chrome and Firefox


    framework: 'jasmine',

    jasmineNodeOpts: {
        defaultTimeoutInterval: 30000
    }
};
