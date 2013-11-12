(function(){
	var Emails = function(options){
		if(options){
			this.autoOrder = options.autoOrder;
			this.objects = options.objects;
		}else{
			this.autoOrder = true;
			this.objects = [{
				email: Crypto.email,
				used: 1
			}]
		}
	};
	Emails.prototype.getFirst = function(){
		return this.objects[0].email;
	};


	var Logins = function(options){
		if(options){
			this.autoOrder = options.autoOrder;
			this.objects = options.objects;
		}else{
			this.autoOrder = true;
			this.objects = [{
				login: /^[^@]+/.exec(Crypto.email)[0],
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
		this.emails = new Emails(data.emails);
		this.lastPasswordAlphabet = data.lastPasswordAlphabet;
		this.lastPasswordLength = data.lastPasswordLength;
		this.logins = new Logins(data.logins);
	};
})();
