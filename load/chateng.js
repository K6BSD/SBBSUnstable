/*
	JAVASCRIPT MULTI-USER CHAT ENGINE -- BY MCMLXXIX (Matt Johnson) 08/2008
	-----------------------------------------------
	FULLSCREEN DEFAULT OR WINDOWED MODE WITH SUPPLIED PARAMETERS
	//TODO: ADD SCROLLBACK HISTORY WINDOW FOR CHAT MESSAGES

	NOTE: 
	For a simple full screen chat, create a script like the following:
	
	load("chateng.js");
	var chat=new ChatEngine(root_directory,room_name);
	Chat(chat);
	
	This will call the following Chat() function 
	to handle the engine in its simplest form
	
	For more advanced chatting, see 
	ChatEngine this.Init() method
*/
function Chat(Engine,key)
{
	if(this.fullscreen) console.clear();
	else
	{
		console.ctrlkey_passthru="+ACGKLOPQRTUVWXYZ_";
		bbs.sys_status|=SS_MOFF;
	}
	while(1)
	{
		if(!key) key=console.inkey(K_NOCRLF|K_NOSPIN|K_NOECHO,5);
		if(!Engine.ProcessKey(key)) break;
		key="";
	}
}
//*************MAIN ENGINE*************
load("qengine.js");
var ChatLog;
var oldpass=console.ctrlkey_passthru;

function ChatEngine(root,name,log_)
{
	ChatLog=		(log_?log_:new Logger(this.root,this.name));
	this.root=		(root?root:Quit(100));
	this.name=		(name?name:"chat");
	
	//DEFAULT VALUES FOR FULL SCREEN CHAT MODE WITH NO DEDICATED INPUT LINE
	this.realtime=	false;
	this.input_line=false;
	this.fullscreen=true;
	this.boxed=		false;
	this.columns=	79;
	this.rows=		24;
	this.x=			1;
	this.y=			1;
	
	this.local_color=	"\1n\1g";
	this.remote_color=	"\1n\1c";
	
	this.buffer=	"";
	this.messages=	[];
	this.history=	[];
	this.queue=new DataQueue(this.root,this.name,ChatLog);

	this.Init=function(mode,parameters)
	{
		if(mode)
		{
			if(!parameters) Quit(100);
			switch(mode)
			{
				case 'F':
					break;
				case 'W':		//WINDOW MODE
					this.columns=	parameters.columns;
					this.rows=		parameters.rows;
					this.input_line=parameters.input_line;
					this.x=			parameters.x;
					this.y=			parameters.y;
					this.fullscreen=false;
					break;
				case 'S':		//SINGLE LINE MODE
					this.rows=		1;
					this.columns=	parameters.columns;
					this.x=			parameters.x;
					this.y=			parameters.y;
					this.input_line={x:this.x,y:this.y,columns:this.columns};
					this.fullscreen=false;
					break;
			}
			console.gotoxy(this.x,this.y);
			Log("Chat Initialized:");
			Log("mode: " + (this.fullscreen==true?"fullscreen":(mode=='W'?"window":"single line")));
		}
		bbs.sys_status |= SS_PAUSEOFF;		
	}
	this.Cycle=function()
	{
		this.Receive();
		this.GetNotices();
	}
	this.ProcessKey=function(key)
	{
		this.Cycle();
		switch(key.toUpperCase())
		{
		//borrowed Deuce's feseditor.js
		case '\x00':	/* CTRL-@ (NULL) */
		case '\x02':	/* CTRL-B KEY_HOME */
		case '\x03':	/* CTRL-C (Center Line) */
		case '\x04':	/* CTRL-D (Quick Find in SyncEdit)*/
		case '\x05':	/* CTRL-E KEY_END */
		case '\x09':	/* CTRL-I TAB... ToDo expand to spaces */
		case '\x0b':	/* CTRL-K */
		case '\x0c':	/* CTRL-L (Insert Line) */
		case '\x0e':	/* CTRL-N */
		case '\x0f':	/* CTRL-O (Quick Save/exit in SyncEdit) */
		case '\x10':	/* CTRL-P */
		case '\x11':	/* CTRL-Q (XOff) (Quick Abort in SyncEdit) */
		case '\x12':	/* CTRL-R (Quick Redraw in SyncEdit) */
		case '\x13':	/* CTRL-S (Xon)  */
		case '\x14':	/* CTRL-T (Justify Line in SyncEdit) */
		case '\x15':	/* CTRL-U (Quick Quote in SyncEdit) */
		case '\x16':	/* CTRL-V (Toggle insert mode) */
		case '\x17':	/* CTRL-W (Delete Word) */
		case '\x18':	/* CTRL-X (PgDn in SyncEdit) */
		case '\x19':	/* CTRL-Y (Delete Line in SyncEdit) */
		case '\x1a':	/* CTRL-Z (EOF) (PgUp in SyncEdit)  */
		case '\x1c':	/* CTRL-\ (RegExp) */
		case '\x1f':	/* CTRL-_ Safe quick-abort*/
		case '\x7f':	/* DELETE */
		case KEY_UP:
		case KEY_DOWN:
		case KEY_LEFT:
		case KEY_RIGHT:
			break;
		case '\x1b':	/* ESC (This should parse extra ANSI sequences) */
			file_remove(this.queue.user_file.name);
			return false;
		case '\b':
			this.BackSpace();
			break;
		case '\r':
			if(!this.fullscreen) this.ClearInputLine();
			else 
			{
				console.left(this.buffer.length)
				console.cleartoeol();
			}
			if(!console.strlen(RemoveSpaces(this.buffer))) 
			{
				this.buffer="";
				break;
			}
			var message={message:this.buffer,user:user.number};
			this.buffer="";
			this.Send(message);
			break;
		default:
			if(key) this.Buffer(key);
			break;
		}
		return true;
	}
	this.ClearInputLine=function()
	{
		ClearLine(this.input_line.columns,this.input_line.x,this.input_line.y);
	}
	this.BackSpace=function()
	{
		if(this.buffer.length>0) 
		{
			if(!this.fullscreen)
			{
				var offset=this.buffer.length;
				console.gotoxy(this.input_line.x+offset,this.input_line.y);
			}
			this.buffer=this.buffer.substring(0,this.buffer.length-1);
			console.left();
			if(this.fullscreen) console.cleartoeol();
			else ClearLine(this.columns-this.buffer.length);
		}
	}
	this.Buffer=function(key)
	{
		if(!this.fullscreen)
		{
			if(this.buffer.length>=this.input_line.columns)
			{
				var overrun=(this.buffer.length-this.input_line.columns)+1;
				var truncated=this.buffer.substr(overrun);
				console.gotoxy(this.input_line.x,this.input_line.y);
				console.write(truncated);
			}
			else 
			{
				var offset=this.buffer.length;
				console.gotoxy(this.input_line.x+offset,this.input_line.y);
			}
		}
		this.buffer+=key;
		console.write(key);
	}
	this.GetNotices=function()
	{
		for(notice in this.queue.notices)
		{
			this.Display(this.queue.notices[notice]);
		}
		this.queue.notices=[];
	}
	this.Display=function(text,color,user_)
	{
		if(!color) color="\1r\1h";
		//FOR FULLSCREEN MODE WITH NO INPUT LINE, DISPLAY MESSAGE IN FULL AND RETURN
		if(this.fullscreen)	
		{
			if(user_) console.putmsg("\r" + color + system.username(user_) + ": " + text + "\r\n",P_SAVEATR);
			else console.putmsg("\r" + color + text + "\r\n",P_SAVEATR);
			if(this.buffer.length) console.putmsg(this.local_color+this.buffer);
		}
		else
		{
			//FOR ALL OTHER MODES, STORE MESSAGES IN AN ARRAY AND HANDLE WRAPPING 
			if(user_) this.Concat(color + system.username(user_)+ ": " + text);
			else this.Concat(color + text);
			console.gotoxy(this.x,this.y);
			for(msg in this.messages)
			{
				console.gotoxy(this.x,this.y+parseInt(msg));
				console.putmsg(this.messages[msg],P_SAVEATR);
				ClearLine(this.columns-console.strlen(strip_ctrl(this.messages[msg])));
			}
		}
	}
	this.Concat=function(text)
	{
		var array=word_wrap(text,this.columns,text.length,false);
		Log(text);
		array=array.split(/[\r\n$]+/);
		for(item in array)
			if(array[item]!="") this.messages.push(RemoveSpaces(array[item]));
		while(this.messages.length>=this.rows)
			this.history.push(this.messages.shift());
	}
	this.Receive=function()
	{
		var data=this.queue.ReceiveData(this.name);
		for(item in data)
		{
			if(data[item].info)
			{
				/*
					TODO: 	ADD PROCESSING RULES FOR NON-MESSAGE DATA
							I.E. PLAYERS ENTERING GAMES, GAME INVITES, PRIVATE CHAT INVITES
				*/
			}
			if(data[item].message) 
				this.Display(data[item].message,this.remote_color,data[item].user);
		}
	}
	this.Send=function(data)
	{
		this.queue.SendData(data,this.name);
		if(data.message) this.Display(data.message,this.local_color,user.number);
	}
	function Log(text)
	{
		ChatLog.Log(text);
	}
	function Quit(ERR)
	{
		if(ERR)
		{
			switch(ERR)
			{
				case 100:
					Log("Error: No root directory specified");
					break;
				case 200:
					Log("Error: No chat window parameters specified");
					break;
				default:
					Log("Error: Unknown");
					break;
			}
		}
		console.ctrlkey_passthru=oldpass;
		bbs.sys_status&=~SS_MOFF;
		bbs.sys_status&=~SS_PAUSEOFF;
		exit(0);
	}
}

