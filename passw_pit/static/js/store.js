(function(){
	var Emails = function(credentials){
		if(credentials.emails){
			this.autoOrder = credentials.emails.autoOrder;
			this.objects = credentials.emails.objects;
		}else{
			this.autoOrder = true;
			this.objects = [{
				email: credentials.email,
				used: 1
			}]
		}
	};
	Emails.prototype.getFirst = function(){
		return this.objects[0].email;
	};


	var Logins = function(credentials){
		if(credentials.logins){
			this.autoOrder = credentials.logins.autoOrder;
			this.objects = credentials.logins.objects;
		}else{
			this.autoOrder = true;
			this.objects = [{
				login: /^[^@]+/.exec(credentials.email)[0],
				used: 1
			}]
		}
	};
	Logins.prototype.getFirst = function(){
		return this.objects[0].login;
	};
	
	
	var Store = window.Store = function(credentials){
		var data;
		if(credentials.data){
			credentials.dataSalt = Crypto.fromString(dataSalt);
			data = JSON.parse(Crypto.decode(Crypto.fromString(data), Crypto.hash(credentials.password, credentials.dataSalt)));
		}else{
			data = {
				lastPasswordAlphabet: 700,
				lastPasswordLength: 20
			};
		}
		this.emails = new Emails(credentials);
		this.lastPasswordAlphabet = data.lastPasswordAlphabet;
		this.lastPasswordLength = data.lastPasswordLength;
		this.logins = new Logins(credentials);
	};
})();
