var express = require('express');
var morgan = require('morgan');
var request = require('request');
var bodyParser = require('body-parser');
var fetch = require('node-fetch');

var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());

var DEVELOPMENT = (process.env.NODE_ENV == 'production') ? false : true;
console.log(DEVELOPMENT);
// Talking to the database
var headers = {'Content-Type': 'application/json'};
var url;

// When developing locally, need to access data APIs
// as if admin
if (DEVELOPMENT) {
  headers.Authorization = 'Bearer ' + process.env.ADMIN_TOKEN;
  url = `https://data.${process.env.PROJECT_NAME}.hasura-app.io`;
} else {
  url = 'http://data.hasura';
}

// Make a request to the data API as the admin role for full access
headers['X-Hasura-Role'] = 'admin';
headers['X-Hasura-User-Id'] = 1;

 app.post('/', function (req, res) {

    // req.body is request JSON object
    
    /* private String signUpEmail;
    private String signUpName;
    private String signUpUsername;
    private String signUpPassword;
    private String signUpInstitution;
    private String signUpDob;
    private String signUpPathToCV;
    private String gender;
    private String role;
    private List<String> skillList;
    private Integer id; */
    
    // extract username and password from req body
    var authTableUser = {
                        username:  req.body.signUpUsername,
                        password:   req.body.signUpPassword
                      };
    
    var opt = {
                method : "POST",
                json : true,
                body : {}
    }
    console.log(opt);
    // create new user in hasura auth table
    opt.body = authTableUser;
    opt.url = "http://auth.hasura/signup";
    request(opt, function (error, response, body) {
            console.log(opt);
            if (!error && response.statusCode === 200) {
                // response from auth API endpoint with OK status --user created in auth table-- extract session id and hasura_id
                var sessionToken = body.auth_token;
                var id = body.hasura_id;
                opt.headers = headers;
                console.log(opt);
                // create user as per role in employer or student table
                if(req.body.role === 'student'){
                        // generate addStudentInfo object
                        
                        var addStudentInfo = {
                            type : "insert",
                            args : {
                                table : 'student_info',
                                objects : [
                                        {
                                           student_id : id,
                                           name : req.body.signUpName,
                                           username : authTableUser.username,
                                           email : req.body.signUpEmail,
                                           institution : req.body.signUpInstitution,
                                           year_of_admission : req.body.yearOfAdmission,
                                           year_of_passing : req.body.yearOfPassing,
                                           percentage : req.body.percentage,
                                           dob : req.body.signUpDob,
                                           gender : req.body.gender,
                                           path_to_cv : req.body.signUpPathToCV
                                        }
                                    ]
                            }
                        };
                        
                        // create student_info
                        opt.body = addStudentInfo;
                        opt.url = "http://data.hasura/v1/query"
                        console.log("options are " + opt.headers);
                        request(opt, function (error, response, body) {

                         
                          
                            if (!error && response.statusCode === 200) { // student_info created successfully
                                // assign role to student
                                opt.url = "http://auth.hasura/admin/user/assign-role"
                                opt.body = {    hasura_id : id,
                                                role : 'student'
                                            };
                                request(opt, function (error, response, body){
                                        if(!error && response.statusCode === 200){
                                            // role assigned successfully add skills
                                            var skillList = req.body.skillList;

                                            var addSkillList = {
                                                type : "insert",
                                                args : {
                                                    table : "student_skills",
                                                    objects : [
                                                            //{emp_id:8,skill:"laravel"},{emp_id:8,skill:".net"}
                                                            
                                                        ]
                                                }
                                            }

                                            var i = 0;
                                            while(i < skillList.length){
                                                addSkillList.args.objects.push({id : id, skill : skillList[i]});
                                                i++;
                                            }
                                            opt.body = addSkillList;
                                            opt.url = "http://data.hasura/v1/query"
                                            request(opt, function(error, response, body){
                                                            if(!error && response.statusCode === 200){
                                                                // skills written signup complete
                                                                res.status(response.statusCode).send(JSON.stringify({message : "success"}));
                                                                // logut the user
                                                                opt.method = "GET";
                                                            }
                                                            else{
                                                                // skills not written -- delete from student_info as well as auth
                                                                var deleteStudentInfo = {
                                                                    type : "delete",
                                                                    args : {
                                                                        table : "student_info",
                                                                        where : {student_id : id}
                                                                    }
                                                                };
                                                                opt.body = deleteStudentInfo;
                                                                opt.url = "http://data.hasura/v1/query";
                                                                request(opt, function (error, response, body){
                                                                            if(!error && response.statusCode === 200){
                                                                                // no error delete from auth table
                                                                                opt.body = {hasura_id : id};
                                                                                opt.url = "http://auth.hasura/admin/user/delete";
                                                                                request(opt, function (error, response, body){
                                                                                        if(error || response.statusCode != 200)
                                                                                            console.log('id ' + id + ' not created successfully please delete from auth');
                                                                                    });
                                                                            }
                                                                            else{ // user not deleted from student_info
                                                                                console.log('id '+id +' not created successfully please delete from auth table and student_info');

                                                                            }
                                                                                
                                                    
                                                                        }
                                                                    );
                                                                // send error response to client
                                                                res.status(response.statusCode).send(JSON.stringify({message : "Something seems to be wrong please try again"}));
                                                            
                                                            }
                                                        }
                                                );
                                        }
                                        else{
                                            // delete from auth as well as student_info whatever the reason for failure

                                            // delete from student_info
                                            var deleteStudentInfo = {
                                                            type : "delete",
                                                            args : {
                                                                table : "student_info",
                                                                where : {student_id : id}
                                                            }
                                                        };
                                            opt.body = deleteStudentInfo;
                                            opt.url = "http://data.hasura/v1/query";       
                                            request(opt, function (error, response, body){
                                                        if(!error && response.statusCode === 200){
                                                            // no error delete from auth table
                                                            opt.body = {hasura_id : id};
                                                            opt.url = "http://auth.hasura/admin/user/delete";
                                                            request(opt, function (error, response, body){
                                                                    if(error || response.statusCode != 200)
                                                                        console.log('id ' + id + ' not created successfully please delete from auth');
                                                                });
                                                        }
                                                        else{ // user not deleted from student_info
                                                            console.log('id '+id +' not created successfully please delete from auth table and student_info');

                                                        }
                                                            
                                
                                                    }
                                                );                                                                                      
                              
                                                // send error message to client
                                                res.status(response.statusCode).send(JSON.stringify({message : "Something seems to be wrong please try again"}));
                                        }
                                    }
                                );
                            }

                            else {
                                // student_info NOT created but user created

                                // depending on reason for not creation send response to client
                                if(response.statusCode != 200){ // bad request -- violation of unique constraint on email column
                                    res.status(response.statusCode).send(JSON.stringify({message : "Sorry this email is already in use"}));                                  
                                }
                                else if(error){
                                    // request not sent to student_info API possibly due to network failure
                                    res.status(response.statusCode).send(JSON.stringify({message : "Something seems to be wrong please try again"}));
                                }

                                // delete user from auth table
                                opt.url = "http://auth.hasura/admin/user/delete";
                                opt.body = {hasura_id : id};
                                request(opt, function (error, response, body){
                                        if(error || response.statusCode != 200) // delete request not sent or not processed
                                            console.log('id '+id +' not created successfully please delete from auth table');

                                    
                                        
                                    }
                                );
                                
                            }                    
                        }
                    );
                }
                else if(req.body.role === 'employer'){
                        // generate addEmployerInfo object
                        
                        var addEmployerInfo = {
                            type : "insert",
                            args : {
                                table : 'employer_info',
                                objects : [
                                        {
                                           emp_id : body.hasura_id,
                                           name : req.body.signUpName,
                                           username : authTableUser.username,
                                           email : req.body.signUpEmail,
                                           company : req.body.company,
                                           dob : req.body.signUpDob,
                                           gender : req.body.gender,
                                           designation : req.body.designation
                                        }
                                    ]
                            }
                        }
                        // create employer_info
                        opt.url = "http://data.hasura/v1/query";
                        opt.body = addEmployerInfo;
                        request(opt, function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                // employer_info created successfully
                            
                                // assign role to employer
                                opt.url = 'http://auth.hasura/admin/user/assign-role';
                                opt.body = {
                                                hasura_id : id,
                                                role : 'employer'
                                            };
                                request(opt, function (error, response, body){
                                        if(!error && response.statusCode === 200){
                                            // role assigned successfully add skills
                                            var skillList = req.body.skillList;

                                            var addSkillList = {
                                                type : "insert",
                                                args : {
                                                    table : "student_skills",
                                                    objects : [
                                                            //{id:8,skill:"laravel"},{id:8,skill:".net"}
                                                            
                                                        ]
                                                }
                                            }

                                            var i = 0;
                                            while(i < skillList.length){
                                                addSkillList.args.objects.push({id : id, skill : skillList[i]});
                                                i++;
                                            }
                                            opt.body = addSkillList;
                                            opt.url = "http://data.hasura/v1/query"
                                            request(opt, function(error, response, body){
                                                            if(!error && response.statusCode === 200){
                                                                // skills written signup complete
                                                                res.status(response.statusCode).send(JSON.stringify({message : "success"}));
                                                            }
                                                            else{
                                                                // skills not written -- delete from employer_info as well as auth
                                                                var deleteEmployerInfo = {
                                                                    type : "delete",
                                                                    args : {
                                                                        table : "employer_info",
                                                                        where : {emp_id : id}
                                                                    }
                                                                };
                                                                opt.body = deleteEmployerInfo;
                                                                opt.url = "http://data.hasura/v1/query";
                                                                request(opt, function (error, response, body){
                                                                            if(!error && response.statusCode === 200){
                                                                                // no error delete from auth table
                                                                                opt.body = {hasura_id : id};
                                                                                opt.url = "http://auth.hasura/admin/user/delete";
                                                                                request(opt, function (error, response, body){
                                                                                        if(error || response.statusCode != 200)
                                                                                            console.log('id ' + id + ' not created successfully please delete from auth');
                                                                                    });
                                                                            }
                                                                            else{ // user not deleted from student_info
                                                                                console.log('id '+id +' not created successfully please delete from auth table and employer_info');

                                                                            }
                                                                                
                                                    
                                                                        }
                                                                    );
                                                                // send error response to client
                                                                res.status(response.statusCode).send(JSON.stringify({message : "Something seems to be wrong please try again"}));
                                                            }
                                                        }
                                                );

                                        }
                                        else{
                                            // delete from auth as well as employer_info whatever the reason for failure

                                            // delete from employer_info
                                            var deleteEmployerInfo = {
                                                            type : "delete",
                                                            args : {
                                                                table : "employer_info",
                                                                where : {emp_id : id}
                                                            }
                                                        };
                                                        opt.body = deleteEmployerInfo;
                                                        opt.url = 'http://data.hasura/v1/query';
                                            request(opt, function (error, response, body){
                                                        if(!error && response.statusCode === 200){
                                                            // no error delete from auth table
                                                            opt.body = {hasura_id : id};
                                                            opt.url = 'http://auth.hasura/admin/user/delete';
                                                            request(opt, function (error, response, body){
                                                                    if(error || response.statusCode != 200)
                                                                        console.log('id ' + id + ' not created successfully please delete from auth');
                                                                });
                                                        }
                                                        else{ // user not deleted from employer_info
                                                            console.log('id '+id +' not created successfully please delete from auth table and employer_info');

                                                        }
                                                            
                                
                                                    }
                                                );                                                                                      
                              
                                                // send error message to client
                                                res.status(response.statusCode).send(JSON.stringify({message : "Something seems to be wrong please try again"}));
                                        }
                                    }
                                );
                            }

                            else {
                                // employer_info NOT created but user created

                                // depending on reason for not creation send response to client
                                if(response.statusCode != 200){ // bad request -- violation of unique constraint on email column
                                    res.status(response.statusCode).send(JSON.stringify({message : "Sorry this email is already in use"}));                                   
                                }
                                else if(error){
                                    // request not sent to employer_info API possibly due to network failure
                                    res.status(response.statusCode).send(JSON.stringify({message : "Something seems to be wrong please try again"}));
                                }

                                // delete user from auth table
                                opt.url = 'http://auth.hasura/admin/user/delete';
                                opt.body = {hasura_id : id};
                                request(opt, function (error, response, body){
                                        if(error || response.statusCode != 200) // delete request not sent or not processed
                                            console.log('id '+id +' not created successfully please delete from auth table');
                                        
                                    }
                                );
                            }
                        }
                    );
                }

            }

            else{ // user not created in auth table
                if(response.statusCode != 200){
                    // bad request send response code -- user NOT created in auth table
                    res.status(response.statusCode).send(JSON.stringify({message: "sorry this username is already taken"}));
                }
                else{ // error
                    // send error message -- request not reached auth API
                    res.status(response.statusCode).send(JSON.stringify({message : "Something seems to be wrong please try again"}));
                }   
            }
        }
    );
}); 

app.get('/', function (req, res) {
  var schemaFetchUrl = url + '/v1/query';
  var options = {
    method: 'POST',
    headers : headers,
    body: JSON.stringify({
      type: 'select',
      args: {
        table: "skill_field_relation",
        columns: ['*']//,
        //where: { table_schema: 'public' }
    }})
  };
  fetch(schemaFetchUrl, options)
    .then(
      (response) => {
        response.text()
          .then(
            (data) => {
              res.send(data);
            },
            (e) => {
              res.send('Error in fetching current schema: ' + err.toString());
            })
          .catch((e) => {
            e.stack();
            res.send('Error in fetching current schema: ' + e.toString());
          });
      },
      (e) => {
        console.error(e);
        res.send('Error in fetching current schema: ' + e.toString());
      })
    .catch((e) => {
      e.stackTrace();
      res.send('Error in fetching current schema: ' + e.toString());
    });
});

/*
 * Sample endpoint to check the role of a user
 * When any user makes a request to this endpoint with
 * the path containing the roleName. Eg: /admin, /user, /anonymous
 * that path only gets served, if the user actually has that role.
 * To test, login to the console as an admin user. /admin, /user will work.
 * Make a request to /admin, /user from an incognito tab. They won't work, only /anonymous will work.
 */
app.get('/:role', function (req, res) {
  var roles = req.get('X-Hasura-Allowed-Roles');

  // Check if allowed roles contains the rolename mentioned in the URL
  if (roles.indexOf(req.params.role) > -1) {
    res.send('Hey, you have the <b>' + req.params.role + '</b> role');
  } else {
    res.status(403).send('DENIED: Only a user with the role <b>' + req.params.role + '</b> can access this endpoint');
  }
});

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});
