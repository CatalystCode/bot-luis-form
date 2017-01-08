var builder = require('botbuilder');
var extend = require('extend');

var intentForms = require('./intentForms');
var luis = require('./luis');

function bind(bot) {

	if (!bot) throw new Error('bot instance was not provided');

	var intents = new builder.IntentDialog();     
	bot.dialog('/', intents);

	intents.onDefault(session => {
			session.send(`Welcome to the automobile bot! This is a sample bot that can be used as a reference for completing missing fields that were not resolved by LUIS.`);
			session.beginDialog('/loop');
		}
	);

	// main loop- ask for text, process intent and start over again
	bot.dialog('/loop', [

		// ask for input
		session => {
			builder.Prompts.text(session, 'How can I help?');
		},

		// get text, call LUIS to extract intent and entities, 
		// prompt user to fill in missing fields
		(session, args, next) => {

			var text = args.response;
			console.log(`user's text: '${text}'`);
			session.sendTyping();

			return luis.query(text)
				.then(luisResult => {
					const intent = luisResult.topScoringIntent.intent;
					console.log(`processing resolved intent: ${intent}`);

					// prepare fields list
					var form = prepareForm(intent);
			
					// update field with LUIS result if available
					form.forEach(field => {
						luisResult.entities.forEach(entity => {
							if (entity.type === field.name || entity.type === field.luisType) {
								field.luisEntity = entity;
							}
						});
					});

					// collect missing fields
					return session.beginDialog('/collectFormData', { form });
				})
				.catch(err => {
					console.error(`error processing intent: ${err.message}`);
					session.send(`there was an error processing your request, please try again later...`);
					return session.cancelDialog(0, '/');
				});
		},

		// get filled-in form and process the request
		(session, args) => {

			session.userData.form = args.form;
			session.send('processing request..');

			// TODO: implement request processing... 
			// in this case just showing the filled-in form
			var formString = '';
			Object.keys(args.form).forEach(key => {
				formString += `${key}: ${args.form[key]} <br/>`;
			});
			session.send(`Form: <br/>${formString}<br/>`);

			// start over again
			session.send('bye bye');
			return session.replaceDialog('/loop');
		}
	]);

	bot.dialog('/collectFormData', [

		// prompt for field value
		(session, args, next) => {

			const form = args.form;
			if (!form) throw new Error('form array was not provided');
			session.dialogData.form = form;
			
			// iterate through the form fields and pick the first one without a value
			for (var i=0; i< form.length; i++) {
				var field = form[i];
				session.dialogData.fieldIndex = i;
				
				if (!field.value) {
					// if this was resolved by LUIS, move to the next handler to prcoess the value
					if (field.luisEntity) return next();

					console.log(`getting type: ${field.type}`);
					var promptType = builder.Prompts[field.type] ? field.type : 'text';

					var options = field.type === 'choice' ?
							field.options.map(option => option.title).join('|') 
							: null;
					
					// prompt for value for this field
					return builder.Prompts[promptType](session, field.prompt, options);
				}
			}

			// format final result as a dictionary
			var formDict = {};
			session.dialogData.form.forEach(f => {
				formDict[f.name] = f.value;
			}); 

			return session.endDialogWithResult({ form: formDict });
		},

		// process input (either by LUIS or the user)
	 	(session, result, next) => {

			var field = session.dialogData.form[session.dialogData.fieldIndex];

			switch (field.type) {

				case 'choice':
					if (field.luisEntity) {
						// we already got a value from LUIS, check if this is a valid value
						var val = field.luisEntity.entity.toLowerCase();
						for (var i=0; i<field.options.length; i++) {
							var option = field.options[i];
							if (option.title.toLowerCase() === val || option.value.toLowerCase() == val) {
								field.value = option.value;
								break;
							}
						}

						if (!field.value) {
							// the value provided by LUIS is not a valid option, 
							// ask the user to choose by reducing the index
							session.dialogData.fieldIndex--;
						}
						break;
					}
					var selectionIndex = result.response.index;
					field.value = field.options[selectionIndex].value;
					break;

				case 'time':
					field.value = field.luisEntity ? 
						builder.EntityRecognizer.resolveTime([field.luisEntity]) :
						builder.EntityRecognizer.resolveTime([result.response])
					break;

				case 'number':
					var val;
					if (field.luisEntity) {
						val = builder.EntityRecognizer.parseNumber([field.luisEntity])
					}
					else {
						val = typeof result.response === 'number' ? 
							result.response : 
							builder.EntityRecognizer.parseNumber(result.response)
					}
					field.value = val;
					break;

				// add more types here like location, images, etc...

				default: // text
					field.value = field.luisEntity ? field.luisEntity.entity : result.response;
					
			}
			delete field.luisEntity;
			session.replaceDialog('/collectFormData', { form: session.dialogData.form });
		}
	]);
}

// create an array of the fields to be populated by the user
function prepareForm(intent) {
	const form = [];
	const fields = intentForms.intents[intent];
	if (!fields) return form;
	
	fields.forEach(field => {
		var instance = {};
		extend(instance, intentForms.fields[field], true);
		instance.name = field;
		form.push(instance);
	});

	return form;
}

module.exports = {
	bind
}

