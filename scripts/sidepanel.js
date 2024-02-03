/**
 * Author: https://github.com/beldog
 * Date: 2024-02-03
 */

//Global Options
const originJira = "";
const remoteJira = "";
const remoteIssueRegex = /[A-z]+-[0-9]+/;

//Constants
const restAPIpath = "/rest/api/2";
const userAPI = originJira + restAPIpath +"/user?accountId=";
const searchAPI = originJira + restAPIpath +"/search";
const issueAPI = originJira + restAPIpath +"/issue";

const mentionsRegex = /\[~accountid:([0-9A-z:\-]+)]/g;
const mentionRegex = /\[~accountid:([0-9A-z:\-]+)]/;

const users = [];

/**
 * Function that delays the execution a defined amount of milliseconds
 * @param ms Milliseconds to delay the execution
 * @returns {Promise<unknown>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Method to create issues into Remote host
 * Example: Important to apply a delay to do not reach usage limits (10 calls per user/second)
 *
 * let data =[{json data...}]
 * data.forEach(function(item, index, arr){
 *     sleep(index*50).then(() => {
 *         createIssue("HL", item);
 *         console.log(item.summary);
 *     });
 * });
 *
 * @param data ie: {'project': 'XX', 'issuetype': 'Task', 'summary': 'lorem ipsum...', 'description': 'lorem ipsum...',
 *                  'parent': '', 'customfield_10501': 1, ...}
 */
function createIssue(data){
  fetch(remoteJira, {
    method: "POST",
    body: JSON.stringify({
      fields: {
        project: { key: data.project},
        issuetype: {name: data.issuetype},
        summary: data.summary,
        //assignee: {id: data.assignee}, //cannot use it unless you know already user's ID on the host
        description: data.description,
        parent: {key: data.parent}
      },
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    }
  })
      .then(res => res.json())
      .then(console.log);
}

async function getIssues(jql="", fields = ""){
  const response = await fetch(searchAPI +"?fields=key,"+ fields +"&jql="+ encodeURI(jql), {
    method: "GET",
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    }
  });

  return await response.json();
}

async function getIssue(key, fields = ""){
  const response = await fetch(issueAPI +"/"+key+"?fields=key,issuetype,summary,assignee,status,project,subtasks"+ fields, {
    method: "GET",
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    }
  });

  return await response.json();
}

async function getResourceURI(uri){
  const response = await fetch(uri, {
    method: "GET",
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    }
  });

  return await response.json();
}

/**
 * Cleaning UI data
 */
function clearData(){
  document.body.querySelector('#message').innerHTML="";
  document.body.querySelector('#jira-key').innerHTML ="";
  document.body.querySelector('#issue-key').innerHTML ="";
  document.body.querySelector('#issue-summary').innerHTML ="";
  document.body.querySelector('#issue-assignee').innerHTML ="";
  document.body.querySelector('#issue-comments').innerHTML ="";
  let status = document.body.querySelector('#issue-status');
  status.innerHTML ="";
  status.removeAttribute("class");
}

/**
 * Replace all user mentions with its Display Jira name
 * @param debug true | false showing console logs for debugging
 */
function replaceMentions(debug = false){
  Object.keys(users).forEach(function (key){
    
    if(debug) console.log("Retrieving id "+ key);
    getResourceURI(userAPI + key).then((response) => {
      let name = response.displayName;
      users[key] = name;
      
      if(debug) console.log("Replacing "+ key + " -> "+ name);
      let elements = document.body.querySelectorAll('[id="id'+ key.replaceAll(":", "_") +'"]');
      
      if(debug) console.log("Total elements for "+ key +" to be replaced: "+ elements.length);
      elements.forEach(function(element){
        element.innerHTML = element.innerHTML.replaceAll("accountid:"+key, name);
      });
    });
  });
}

chrome.runtime.onMessage.addListener(({ url, debug }) => {
  let u = new URL(url);
  let remoteKey = u.href.match(remoteIssueRegex);
  if(debug) console.log("remoteKey", remoteKey);

  try{
    if(remoteKey != null){
      let key = remoteKey[0];

      clearData();

      // Hide instructions.
      document.body.querySelector('#instructions').style.display = 'none';
      document.body.querySelector('#details').style.display = 'block';
      
      let remoteJiraKey = document.body.querySelector('#remote-key');
      let anchor = document.createElement("a");
      anchor.setAttribute("href", remoteJira +"/browse/"+ key);
      anchor.setAttribute("target", "_blank");
      anchor.appendChild(document.createTextNode(key));
      remoteJiraKey.appendChild(anchor);

      getIssues('project=HL AND cf[10585] ~"' + key +'"', "").then((response) => {
          if(debug) console.log("jql", response);

          if(response.total === 0){
            let message = document.createTextNode("No issue found with this Key");
            document.body.querySelector('#message').appendChild(message);
          }
          else{
            response.issues.forEach(function(issue){
              
              let element_key = document.body.querySelector('#origin-key');
              let anchor = document.createElement("a");
              anchor.setAttribute("href", originJira +"/browse/"+ issue.key);
              anchor.setAttribute("target", "_blank");
              anchor.appendChild(document.createTextNode(issue.key));
              element_key.appendChild(anchor);

              getResourceURI(issue.self).then((response) => {
                if(debug) console.log("issue", response);
                let fields = response.fields;

                let summary = document.body.querySelector('#issue-summary');
                let status = document.body.querySelector('#issue-status');
                let assignee = document.body.querySelector('#issue-assignee');
                let comments = document.body.querySelector('#issue-comments');

                let statusCategory = "status-todo";
                if(fields.status.statusCategory.colorName === "yellow") { //In progress
                  statusCategory = "status-inprogress";
                }
                else if(fields.status.statusCategory.colorName === "green") { //Done
                  statusCategory = "status-done";
                }

                summary.appendChild(document.createTextNode(fields.summary));
                status.appendChild(document.createTextNode(fields.status.name));
                status.classList.add(statusCategory);
                assignee.appendChild(document.createTextNode(fields.assignee.displayName));

                let list = document.createElement("ul");
                comments.appendChild(list);

                fields.comment.comments.forEach(function(comment){
                  let id = comment.author.accountId;

                  let authorNode = document.createElement("span");
                  authorNode.classList.add("author");
                  authorNode.setAttribute("id", "id"+ id.replaceAll(":", "_"));


                  if(users[id] != null){
                    authorNode.appendChild(document.createTextNode(users[id]));
                  }
                  else{
                    if(debug) console.log("Adding new id to translate "+ id);
                    users[id] = null;
                    authorNode.appendChild(document.createTextNode("[~accountid:"+id+"]"));
                  }

                  let node = document.createElement("li");
                  let date = new Date(comment.created);
                  node.appendChild(document.createTextNode(date.toLocaleString()));
                  node.appendChild(document.createTextNode(" | "));
                  node.appendChild(authorNode);
                  node.appendChild(document.createElement("br"));
                  let commentNode = document.createElement("p");
                  commentNode.setAttribute("id", "id"+ comment.id);
                  
                  
                  //Looking for mentions
                  //i.e: [~accountid:5ac4aa863a2c06208c07b914] 
                  let body = comment.body;
                  body = body.replaceAll("\n", "<br>");
                  commentNode.innerHTML = body;
                  
                  let mentions = body.match(mentionsRegex);
                  
                  //Iterating over mentions to later replace them with real names
                  if(mentions != null && mentions.length > 0){
                    mentions.forEach(function(mention){
                      let id = mention.match(mentionRegex);

                      if(id != null && id.length >= 2){
                        if(users[id[1]] != null){
                          commentNode.innerHTML = commentNode.innerHTML.replaceAll(mention, "[~"+ users[id[1]] +"]");
                        }
                        else{
                          if(debug) console.log("Adding new id to translate "+ id[1]);
                          users[id[1]] = null;

                          let mentionNode = document.createElement("span");
                          mentionNode.classList.add("mention");
                          mentionNode.setAttribute("id", "id"+ id[1].replaceAll(":", "_"));
                          mentionNode.appendChild(document.createTextNode(mention))
                          commentNode.innerHTML = commentNode.innerHTML.replaceAll(mention, mentionNode.outerHTML);
                        }
                      }
                    });
                  }

                  node.appendChild(commentNode);
                  list.prepend(node);
                });

                replaceMentions(debug);
              });
              
            });
          }
          
      });
    }
  }
  catch(err){
    console.log(err);
  }
});
