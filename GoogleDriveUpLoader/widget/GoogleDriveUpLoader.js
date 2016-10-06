/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, document, jQuery */
/*mendix */
/*
    GoogleDriveUpLoader
    ========================

    @file      : GoogleDriveUpLoader.js
    @version   : 
    @author    : Simon Martyr (@vintage_si)
    @date      : Wed, 13 May 2015 12:33:37 GMT
    @updated   : Thu, 29 Sep 2016 13:27:30 GMT
    @copyright : 
    @license   : 

*/

define([
    "dojo/_base/declare", 
    "mxui/widget/_WidgetBase", 
    "dijit/_TemplatedMixin",
    "mxui/dom", 
    "dojo/dom", 
    "dojo/query", 
    "dojo/dom-prop", 
    "dojo/dom-geometry", 
    "dojo/dom-class",
    "dojo/dom-style", 
    "dojo/dom-construct",
    "dojo/_base/array", 
    "dojo/_base/lang",
    "dojo/text", 
    "dojo/html", 
    "dojo/_base/event", 
    "dojo/text!GoogleDriveUpLoader/widget/template/GoogleDriveUpLoader.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domQuery, domProp, domGeom, domClass, domStyle, domConstruct, dojoArray, lang, text, html, event, widgetTemplate) {
    "use strict";
    
    
    gapi.load("auth", {
        'callback': console.log('auth loaded')
    });
    
    gapi.load("picker", {
        'callback': console.log('picker loaded')
    });

    // Declare widget's prototype.
    return declare("GoogleDriveUpLoader.widget.GoogleDriveUpLoader", [_WidgetBase, _TemplatedMixin], {

        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Parameters configured in the Modeler.
        main: null,
        token: null,
        FolderID: null,
        mfToExecute: null,
        mfToExecuteCopy: null,
        mfToRetrieveAppID: null,

        objStore: null,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _scope: ["https://www.googleapis.com/auth/drive.file"],
        _requestToken: null,
        _flag: false,
        _AppID: null,
        _APIKey: null,
        _userToken : null, 
        _conextObj: null, 

        constructor: function () {

        },

        postCreate: function () {
            console.log(this.id + ".postCreate");
            this.getUser(); // get correct user object from system user.
        },

        update: function (obj, callback) {
            console.log(this.id + ".update");
            callback();
            this._conextObj = obj;
        },

        getUser: function () {
            var guid = mx.session.getUserId();
            mx.data.get({
                xpath: "//" + this.main,
                guid: guid,
                callback: lang.hitch(this, this.tokenGet)
            });


        },

        tokenGet: function (obj) {
            if (obj !== null) {
                console.log("User " + obj.get("FullName"));
                this._userToken = obj.get(this.token);
                this.getAppID();
            } else {
                console.log("not token found, this should never happen");
                this._flag = true;
            }

        },

        getAppID: function () {
            mx.data.action({
                params: {
                    actionname: this.mfToRetrieveAppID
                },
                callback: lang.hitch(this, this.appIDSet),
                error: lang.hitch(this, function (error) {
                    console.log(this.id + ': An error occurred while executing microflow: ' + error.description);
                })
            });
        },

        
        appIDSet: function (obj) {
            if (obj !== null) {
                var splitter = obj.indexOf("[,]");
                this._AppID = obj.substr(0 , splitter - 1);
                this._APIKey = obj.substr(splitter + 4);

                if(this._userToken != null && this._APIKey != null && this._AppID != null){
                    this.createPicker();
                }
                else{
                    console.log("one or more tokens failed to retrieve");
                }
            }
            else{
                console.log("problem occured during the getting of user token or API information");
            }
        },

        createPicker: function () {
            console.log("creating picker"); 

            var view = new google.picker.DocsView()
                .setParent("root")
                .setIncludeFolders(true);

            var picker = new google.picker.PickerBuilder().
            addView(view).
            addView(new google.picker.DocsUploadView()).
            setOAuthToken(this._userToken).
            setDeveloperKey(this._APIKey).
            setAppId(this._AppID).
            setCallback(lang.hitch(this, this.pickerCallback)).
            enableFeature(google.picker.Feature.SIMPLE_UPLOAD_ENABLED).
            build();
            picker.setVisible(true);

        },

        pickerCallback: function (data) {

            if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                var doc = data[google.picker.Response.DOCUMENTS][0];

                this._conextObj.set(this.objStore, doc.id);
                if (doc.isNew) {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: this.mfToExecuteCopy,
                            guids: [this._conextObj.getGuid()]
                        },
                        callback: function (obj) {
                            console.log("sent to backend");
                        },
                        error: lang.hitch(this, function (error) {
                            console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                        })
                    }, this);
                } else {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: this.mfToExecute,
                            guids: [this._conextObj.getGuid()]
                        },
                        callback: function (obj) {
                            console.log("sent to backend");
                        },
                        error: lang.hitch(this, function (error) {
                            console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                        })
                    }, this);
                }
            }
        }

    });
});
require(["GoogleDriveUpLoader/widget/GoogleDriveUpLoader"], function () {
    "use strict";
});