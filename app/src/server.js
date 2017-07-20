// import libraries
var express = require('express');
var morgan = require('morgan');
var crypto = require('crypto');
var request = require('request');
var bodyParser = require('body-parser');

var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});

// your routes here
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
    var authTableUser = {username:  req.body.signUpUsername,
                        password:   getHash(req.body.signUpPassword)
                    };

    // create new user in hasura auth table
    request.post(
        'https://auth.outfight74.hasura-app.io/signup',
        { json: authTableUser },
        function (error, response, body) {
            if (!error && response.statusCode === 200) {
                // response from auth API endpoint with OK status --user created in auth table-- extract session id and hasura_id
                var sessionToken = body.auth_token;
                var id = body.hasura_id;

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
                                           password : authTableUser.password,
                                           email : req.body.signUpEmail,
                                           institution : req.body.signUpInstitution,
                                           year_of_admission : req.body.signUpYoa,
                                           year_of_passing : req.body.signUpYop,
                                           percentage : req.body.signUpPercentage,
                                           dob : req.body.signUpDob,
                                           gender : req.body.gender,
                                           path_to_cv : req.body.signUpPathToCV
                                        }
                                    ]
                            }
                        }
                        // create student_info
                        request.post(
                        'https://data.outfight74.hasura-app.io/v1/query',
                        { json: addStudentInfo },
                        function (error, response, body) {
                            if (!error && response.statusCode === 200) { // student_info created successfully
                                // assign role to student 
                                request.post(
                                    'https://auth.outfight74.hasura-app.io/admin/user/assign-role',
                                    {json : {
                                                hasura_id : id,
                                                role : 'student'
                                            }
                                    },
                                    function (error, response, body){
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
                                                addSkillList.args.objects.push(skillList[i]);
                                                i++;
                                            }
                                            
                                            request.post('https://data.outfight74.hasura-app.io/v1/query',
                                                        {json : addSkillList},
                                                        function(error, response, body){
                                                            if(!error && response.statusCode === 200){
                                                                // skills written signup complete
                                                                res.send('Success');
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
                                                                request.post(
                                                                        'https://data.outfight74.hasura-app.io/v1/query',
                                                                        {json : deleteStudentInfo},
                                                                        function (error, response, body){
                                                                            if(!error && response.statusCode === 200){
                                                                                // no error delete from auth table
                                                                                request.post(
                                                                                    'https://auth.outfight74.hasura-app.io/admin/user/delete',
                                                                                    {json : {hasura_id : id}},
                                                                                    function (error, response, body){
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
                                                                res.send('Something seems to be wrong please try again');
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
                                            request.post(
                                                    'https://data.outfight74.hasura-app.io/v1/query',
                                                    {json : deleteStudentInfo},
                                                    function (error, response, body){
                                                        if(!error && response.statusCode === 200){
                                                            // no error delete from auth table
                                                            request.post(
                                                                'https://auth.outfight74.hasura-app.io/admin/user/delete',
                                                                {json : {hasura_id : id}},
                                                                function (error, response, body){
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
                                                res.send('Something seems to be wrong please try again');
                                        }
                                    }
                                );
                            }

                            else {
                                // student_info NOT created but user created

                                // depending on reason for not creation send response to client
                                if(response.statusCode != 200){ // bad request -- violation of unique constraint on email column
                                    res.send('Sorry this email is already in use');                                    
                                }
                                else if(error){
                                    // request not sent to student_info API possibly due to network failure
                                    res.send('Something seems to be wrong please try again');
                                }

                                // delete user from auth table
                                request.post(
                                    'https://auth.outfight74.hasura-app.io/admin/user/delete',
                                    {json : {hasura_id : id}},
                                    function (error, response, body){
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
                                           password : authTableUser.password,
                                           email : req.body.signUpEmail,
                                           company : req.body.signUpInstitution,
                                           dob : req.body.signUpDob,
                                           gender : req.body.gender,
                                           designation : req.body.designation
                                        }
                                    ]
                            }
                        }
                        // create employer_info
                        request.post(
                        'https://data.outfight74.hasura-app.io/v1/query',
                        { json: addEmployerInfo },
                        function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                // employer_info created successfully
                            
                                // assign role to employer
                                request.post(
                                    'https://auth.outfight74.hasura-app.io/admin/user/assign-role',
                                    {json : {
                                                hasura_id : id,
                                                role : 'employer'
                                            }
                                    },
                                    function (error, response, body){
                                        if(!error && response.statusCode === 200){
                                            // role assigned successfully add skills

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
                                            request.post(
                                                    'https://data.outfight74.hasura-app.io/v1/query',
                                                    {json : deleteEmployerInfo},
                                                    function (error, response, body){
                                                        if(!error && response.statusCode === 200){
                                                            // no error delete from auth table
                                                            request.post(
                                                                'https://auth.outfight74.hasura-app.io/admin/user/delete',
                                                                {json : {hasura_id : id}},
                                                                function (error, response, body){
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
                                                res.send('Something seems to be wrong please try again');
                                        }
                                    }
                                );
                            }

                            else {
                                // employer_info NOT created but user created

                                // depending on reason for not creation send response to client
                                if(response.statusCode != 200){ // bad request -- violation of unique constraint on email column
                                    res.send('Sorry this email is already in use');                                    
                                }
                                else if(error){
                                    // request not sent to employer_info API possibly due to network failure
                                    res.send('Something seems to be wrong please try again');
                                }

                                // delete user from auth table
                                request.post(
                                    'https://auth.outfight74.hasura-app.io/admin/user/delete',
                                    {json : {"hasura_id" : id}},
                                    function (error, response, body){
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
                    res.send(body.code);
                }
                else{ // error
                    // send error message -- request not reached auth API
                    res.send('Something seems to be wrong please try again');
                }   
            }
        }
    );
}); 

function getHash(userPassword, salt) {
    var hashedPassword;

    hashedPassword = crypto.pbkdf2Sync(userPassword, salt, 100000, 512, 'sha512').toString('hex');

    return ['pbkdf2Sync', salt, hashedPassword].join('#');
}