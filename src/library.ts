import builder = require("botbuilder");
import crypto = require("crypto");

import { IAuthorization, IAuthorizationStore} from "./store"

const libraryName : string = "botauth";
const dialogName : string = "auth";

export const name : string = `${libraryName}:${dialogName}`;

export function build(store : IAuthorizationStore) {
    //create a new library of dialogs for our dialogs
    let authlib = new builder.Library(libraryName);

    //core auth dialog which shows the sign-in card and waits for a response.
    authlib.dialog(dialogName, new builder.SimpleDialog(function(session : builder.Session, args : any) {
        
        let providerId = args ? args.providerId : "";
        let authUrl = args ? args.authUrl : "";

        if(session.userData && session.userData.botauth && session.userData.botauth.tokens && session.userData.botauth.tokens[providerId]) {
            console.log(`[${name}] resumed`);
            session.endDialog("thanks. you're signed in");
        } else {
            console.log(`[${name}] started`);
            //generate a non-guessable cryptographically random id to reference stored authorization state
            let authId = crypto.randomBytes(32).toString('hex');
            let authObj :IAuthorization = {
                _id :  authId,
                address : session.message.address   
            };
            
            store.saveAuthorization(authObj, (err:Error, id : string) => {
                if(!err) {
                    //send the signin card to the user
                    var msg = new builder.Message(session)
                        .attachments([ 
                            new builder.SigninCard(session)
                                .text("Connect to OAuth Provider. You can say 'cancel' to go back without signing in.") 
                                .button("connect", `${authUrl}?state=${id}`)
                        ]);
                    session.send(msg); 
                } else {
                    throw err;
                }
            });
        }
    }).cancelAction("cancel", "cancelling authentication...", { matches: /cancel/, dialogArgs : false } ));

    return authlib;
};