module.exports = function (config) {

    'use strict';

    config.set({

        basePath : '../',

        files : [
            'http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.js',
            'http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-mocks.js',
            'http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-touch.js',
            'http://cdnjs.cloudflare.com/ajax/libs/angular-ui-bootstrap/0.12.1/ui-bootstrap-tpls.js',
            'app/js/app.js',
            'app/js/services/gameLogicService.js',
            'app/js/services/gameAIService.js',

            'test/unit/gameAIServiceSpec.js'

        ],

        reporters: ['progress', 'coverage'],

        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'app/js/services/gameLogicService.js': ['coverage']
        },

        // optionally, configure the reporter
        coverageReporter: {
            type : 'html',
            dir : 'coverage/'
        },

        autoWatch : true,

        frameworks: ['jasmine'],

        browsers : ['Chrome'],

        plugins : [
            'karma-chrome-launcher',
            'karma-jasmine',
            'karma-coverage'
        ]

    });
};