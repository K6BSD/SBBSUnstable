// sbbsimsg.js

// Synchronet inter-bbs instant message module

// $Id$

const REVISION = "$Revision$".split(' ')[1];

const UDP_RESPONSE_TIMEOUT = 5000	// milliseconds

load("sbbsdefs.js");
load("nodedefs.js");
load("sockdefs.js");	// SOCK_DGRAM

// Global vars
var imsg_user;
var last_user=0;
var users=0;

print("\1n\1hSynchronet \1cInstant Message \1wModule \1n" + REVISION + "\r\n");

// Parse arguments
for(i=0;i<argc;i++)
	if(argv[i].toLowerCase()=="-l") {
		list_users(true);
		exit();
	}

// Read the list of systems into list array
fname = system.ctrl_dir + "sbbsimsg.lst";

f = new File(fname);
if(!f.open("r")) {
	alert("Error opening " + fname);
	exit();
}

sys = new Array();
list = f.readAll();
f.close();
for(i in list) {
	if(list[i]==null)
		break;
	while(list[i].charAt(0)==' ')		// skip prepended spaces
		list[i] = list[i].slice(1);

	word = list[i].split(/\s+/);

	if(word[0].charAt(0)==';' ||		// comment? 
		word[0] == system.host_name ||
		word[0] == system.inetaddr)		// local system?
		continue;						// ignore

	if(word[1] != undefined)  {
		if(!word[1].length)
		{
			printf("Setting zero-len %s to undefined\r\n",word[1]);
			word[1]=undefined;
		}

		if(word[1].search(/^\s*$/m)!=-1)
		{
			printf("Setting %s to undefined\r\n",word[1]);
			word[1]=undefined;
		}
	}

	sys.push( { addr: word[0], ip : word[1], udp: false, failed: false, reply: 999999 } );
}

function save_sys_list()
{
	sys.sort(sortarray);
	fname = system.ctrl_dir + "sbbsimsg.lst";
	f = new File(fname);
	if(!f.open("w"))
		return;
	for(i=0;sys[i]!=undefined;i++) {
		if(sys[i].ip == undefined)
			f.writeln(sys[i].addr);
		else
			f.writeln(format("%-63s ", sys[i].addr) +  sys[i].ip);
	}
	f.close();
}

function sortarray(a, b)
{
	return(a.reply-b.reply);
}

function parse_response(response, show)
{
	// Skip header
	while(response.length && response[0].charAt(0)!='-')
		response.shift();
	if(response.length && response[0].charAt(0)=='-')
		response.shift();	// Delete the separator line
	while(response.length && !response[0].length)
		response.shift();	// Delete any blank lines
	while(response.length && !response[response.length-1].length)
		response.pop();		// Delete trailing blank lines

	if(!response.length) {
		if(show)
			print();
		return;
	}

	if(show) {
		str = format("%lu user%s",response.length,response.length==1 ? "":"s");
		printf("\1g\1h%-33s Time   Age Sex\r\n",str);
	}

	for(j in response) {
		if(response[j]=="")
			continue;

		if(show) {
			console.line_counter=0;	// defeat pause
			print(format("\1h\1y%.25s\1n\1g %.48s"
				,response[j],response[j].slice(26)));
		}
		var u = new Object;
		u.host = sys[i].addr;
		u.name = format("%.25s",response[j]);
		u.name = truncsp(u.name);
		imsg_user.push(u);
		users++;
	}
}

function list_users(show)
{
	imsg_user = new Array();
	var udp_req=0;
	var udp_replies=0;
	var replies=0;

	users = 0;
	start = new Date();
	print("\1m\1hListing Systems and Users (Ctrl-C to Abort)...");

	/* UDP systems */
	for(i=0;sys[i]!=undefined;i++)
		sys[i].udp=false;	// Reset the udp flag
	sock = new Socket(SOCK_DGRAM);
	//sock.debug=true;
	sock.bind(0,server.interface_ip_address);
	for(i=0;sys[i]!=undefined && !(bbs.sys_status&SS_ABORT);i++) {
		if(sys[i].ip==undefined)
			continue;
		/* Try SYSTAT and finger */
		if(!sock.sendto("\r\n",sys[i].ip,IPPORT_SYSTAT))	// Get list of active users
			continue;
		udp_req++;
	}

	begin = new Date();
	while(replies<udp_req && new Date().valueOf()-begin.valueOf() < UDP_RESPONSE_TIMEOUT 
		&& !(bbs.sys_status&SS_ABORT))
	{

		if(!sock.poll(1))
			continue;

		message=sock.recvfrom(20000);
		if(message==null)
			continue;
		i=get_sysnum(message.ip_address);
		if(i==-1)
			continue;
		if(sys[i].udp == false) {
			replies++;
			udp_replies++;
			sys[i].udp=true;
			sys[i].reply=new Date().valueOf()-start.valueOf();

			response=message.data.split("\r\n");

			if(show) {
				console.line_counter=0;	// defeat pause
				printf("\1n\1h%-25.25s\1n ",sys[i].addr);
			}

			parse_response(response, show);
		}
	}
	
	sock.close();

	t = new Date().valueOf()-start.valueOf();
	printf("\1m\1h%lu systems (%lu UDP) and %lu users listed in %d seconds.\r\n"
		,replies, udp_replies, users, t/1000);
	save_sys_list();
}

function get_sysnum(ip)
{
	for(i in sys)
		if(sys[i].ip==ip)
			return(i);
	printf("Unexpected response from %s\r\n",ip);
	return(-1);
}

function send_msg(dest, msg)
{

	if((hp = dest.indexOf('@'))==-1) {
		alert("Invalid user");
		exit();
	}
	host = dest.slice(hp+1);
	destuser = dest.substr(0,hp);

	printf("\1h\1ySending...\r\1w");
	sock = new Socket();
	//sock.debug = true;
	sock.bind(0,server.interface_ip_address);
	do {
		if(!sock.connect(host,IPPORT_MSP)) {
			alert("MSP Connection to " + host + " failed with error " + sock.last_error);
		}
		else {
			sock.send("B"+destuser+"\0"+/* Dest node +*/"\0"+msg+"\0"+user.name+"\0"+"Node: "+bbs.node_num+"\0\0"+system.name+"\0");
		}
	} while(0);

	sock.close();
}

function getmsg()
{
	var lines=0;
	var msg="";
	const max_lines = 5;

	printf("\1n\1g\1h%lu\1n\1g lines maximum (blank line ends)\r\n",max_lines);
	while(bbs.online && lines<max_lines) {
		console.print("\1n: \1h");
		mode=0;
		if(lines+1<max_lines)
			mode|=K_WRAP;
		str=console.getstr(76, mode);
		if(str=="")
			break;
		msg+=str;
		msg+="\r\n";
		lines++;
	}

	if(!lines || !bbs.online || bbs.sys_status&SS_ABORT)
		return("");

	return(msg);
}

list_users(true);	// Needed to initialize imsg_user[]
console.crlf();

var key;
while(bbs.online) {
	console.line_counter=0;	// defeat pause
	console.print("\1n\1h\1bInter-BBS: ");
	console.mnemonics("~Telegram, ~Message, ~List, or ~Quit: ");
	bbs.sys_status&=~SS_ABORT;
	while(bbs.online && !(bbs.sys_status&SS_ABORT)) {
		key=console.inkey(K_UPPER, 500);
		if(key=='Q' || key=='L' || key=='T' || key=='M' || key=='\r')
			break;
		if(system.node_list[bbs.node_num-1].misc&(NODE_MSGW|NODE_NMSG)) {
			console.line_counter=0;	// defeat pause
			console.saveline();
			console.crlf();
			bbs.nodesync();
			console.crlf();
			console.restoreline();
		}
	}
//	printf("key=%s\r\n",key);
	switch(key) {
		case 'L':
			print("\1h\1cList\r\n");
			list_users(true);
			console.crlf();
			break;
		case 'T':
			printf("\1h\1cTelegram\r\n\r\n");
			printf("\1n\1h\1y(user@hostname): \1w");
			if(imsg_user.length)
				dest=format("%s@%s",imsg_user[last_user].name,imsg_user[last_user].host);
			else
				dest="";
			dest=console.getstr(dest,64,K_EDIT|K_AUTODEL);
			if(dest==null || dest=='' || bbs.sys_status&SS_ABORT)
				break;
			if((msg=getmsg())=='')
				break;
			send_msg(dest,msg);
			console.crlf();
			break;
		case 'M':
			print("\1h\1cMessage\r\n");
			if(!imsg_user.length) {
				alert("No users!\r\n");
				break;
			}
			done=false;
			while(bbs.online && !done) {
				printf("\r\1n\1h\x11\1n-[\1hQ\1nuit]-\1h\x10 \1y%-25s \1c%s\1>"
					,imsg_user[last_user].name,imsg_user[last_user].host);
				switch(console.getkey(K_UPPER|K_NOECHO)) {
					case '+':
					case '>':
					case ']':
					case '\x06':	/* right arrow */
					case 'N':
					case '\n':		/* dn arrrow */
						last_user++;
						if(last_user>=imsg_user.length)
							last_user=0;
						break;

					case '-':
					case '<':
					case '[':
					case '\x1d':	/* left arrow */
					case 'P':
					case '\x1e':	/* up arrow */
						last_user--;
						if(last_user<0)
							last_user=imsg_user.length-1;
						break;
					case '\x1b':	/* ESC */
					case 'Q':
						printf("\r\1>");
						done=true;
						break;
					case '\r':
						done=true;
						dest=format("%s@%s"
							,imsg_user[last_user].name,imsg_user[last_user].host);
						printf("\r\1n\1cSending message to \1h%s\1>\r\n",dest);
						if((msg=getmsg())=='')
							break;
						send_msg(dest,msg);
						console.crlf();
						break;
				}
			}
			break;
		default:
			print("\1h\1cQuit");
			exit();
			break;
	}
}
