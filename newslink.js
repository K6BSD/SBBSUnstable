// newslink.js

// Synchronet Newsgroup Link/Gateway Module

// $Id$

// Configuration file (in ctrl/newslink.cfg) format:

// ;this line is a comment
// server	servername
// port		TCP port number (defaults to 119)
// user		username (optional)
// pass		password (optional)
// area		subboard (internal code) newsgroup flags [attachment_dir]
// ...

// Defined area flags:
// x		do not add tearlines & taglines to exported messages
// n		do not add "From Newsgroup" text to imported messages
// t		do not add tearline to imported messages
// a		convert extended-ASCII chars to ASCII on imported messages
// r		remove "Newsgroups:" header field from imported messages
// b        decode binary attachments
// i		import all (not just new articles)
// s		no subject filtering

const REVISION = "$Revision$".split(' ')[1];

printf("Synchronet NewsLink %s session started\r\n", REVISION);

var tearline = format("--- Synchronet %s%s-%s NewsLink %s\r\n"
					  ,system.version,system.revision,system.platform,REVISION);
var tagline	=  format(" *  %s - %s - telnet://%s\r\n"
					  ,system.name,system.location,system.inetaddr);
var antispam = format(".remove-%s-this"
					  ,random(50000).toString(36));

var cfg_fname = system.ctrl_dir + "newslink.cfg";

var global_flags = "";	// global flags  - area flags applied to all areas

load("sbbsdefs.js");
load("newsutil.js");	// write_news_header() and parse_news_header()

var debug = false;
var slave = false;
var reset_import_ptrs = false;		// Reset import pointers, import all messages
var update_import_ptrs = false;		// Update import pointers, don't import anything
var reset_export_ptrs = false;		// Reset export pointers, export all messages
var update_export_ptrs = false;		// Update export pointers, don't export anything
var email_addresses = true;			// Include e-mail addresses in headers
var import_amount = 0;				// Import a fixed number of messages per group
var lines_per_yield = 5;			// Release time-slices ever x number of lines
var yield_length = 1;				// Length of yield (in milliseconds)
var max_newsgroups_per_article = 5;	// Used for spam-detection

// Parse arguments
for(i=0;i<argc;i++) {
	if(argv[i].toLowerCase()=="-d")			// debug
		debug = true;
	else if(argv[i].toLowerCase()=="-ri")	// reset import pointers (import all)
		reset_import_ptrs = true;
	else if(argv[i].toLowerCase()=="-ui")	// update import pointers (import none)
		update_import_ptrs = true;
	else if(argv[i].toLowerCase()=="-re")	// reset export pointers (export all)
		reset_export_ptrs = true;
	else if(argv[i].toLowerCase()=="-ue")	// update export pointers (export none)
		update_export_ptrs = true;
	else if(argv[i].toLowerCase()=="-ne")	// no e-mail addresses
		email_addresses = false;
	else if(argv[i].toLowerCase()=="-nm")	// no mangling of e-mail addresses
		antispam = "";
	else if(argv[i].toLowerCase()=="-ix") 	// import a fixed number of messages
	{
		import_amount = parseInt(argv[i+1]);
		if(import_amount)
			i++;
		else
			import_amount = 500;			// default 500
	}
	else
		cfg_fname = argv[i];
}

if(this.js==undefined) 		// v3.10?
	js = { terminated: false };
else
	js.auto_terminate = false;

// Write a string to the server socket
function write(str)
{
	socket.send(str);
}

function writeln(str)
{
	if(debug)
		printf("cmd: %s\r\n",str);
	write(str + "\r\n");
}

function readln(str)
{
	rsp = socket.readln();
	if(debug)
		printf("rsp: %s\r\n",rsp);
	return(rsp);
}

function unique_fname(dir,fname)
{
	var new_fname=fname;
	var file_num=0;
	var ext;
	while(file_exists(dir + new_fname) && file_num<1000) { 
		// generate unique name, if necessary
		ext=fname.lastIndexOf('.');
		if(ext<0)
			ext="";
		else
			ext=fname.slice(ext);
		// Convert filename.ext to filename.<article>.ext
		new_fname=format("%.*s.%lu%s",fname.length-ext.length,fname,file_num++,ext);
	}
	return(dir + new_fname);
}

var host;
var port=119;
var username;
var password;
var interface_ip_address=server.interface_ip_address;
area = new Array();

/******************************/
/* Read/Parse the Config File */
/******************************/

cfg_file = new File(cfg_fname);
if(!cfg_file.open("r")) {
	printf("!Error %d opening %s\r\n",errno,cfg_fname);
	delete cfg_file;
	exit();
}

while(!cfg_file.eof) {
	line = cfg_file.readln();
	if(line==null || line[0] == ';' || !line.length || line==undefined)
		continue;
	line = truncsp(line);
	str=line.split(/\s+/);
	switch(str[0].toLowerCase()) {
		case "disabled":
			printf("!NewsLink DISABLED in %s\r\n",cfg_fname);
			delete cfg_file;
			exit();
		case "server":
			host=str[1];
			break;
		case "port":
			port=parseInt(str[1]);
			break;
		case "interface":
			interface_ip_address=str[1];
			break;
		case "user":
			username=str[1];
			break;
		case "pass":
			password=str[1];
			break;
		case "flags":
			global_flags=str[1];
			break;
		case "area":
			area.push(str);
			break;
		case "debug":
			debug=true;
			break;
		case "slave":
			slave=true;
			break;
		case "tagline":
			str.shift();				// Remove first element (keyword)
			tagline=str.join(' ');		// Combine remaining elements (tagline)
			tagline+="\r\n";
			break;
		case "lines_per_yield":
			lines_per_yield=parseInt(str[1]);
			break;
		case "yield_length":
			yield_length=parseInt(str[1]);
			break;
		case "max_newsgroups_per_article":
			max_newsgroups_per_article=parseInt(str[1]);
			break;
		default:
			print("!UNRECOGNIZED configuration keyword: " + str[0]);
			break;
	}
}
delete cfg_file;

printf("server: %s\r\n",host);
if(debug) {
	printf("username: %s\r\n",username);
	printf("password: %s\r\n",password);
}
printf("%ld areas\r\n",area.length);

if(host==undefined || !host.length) {
	print("!No news server specified");
	exit();
}

printf("Connecting to %s port %d ...\r\n",host,port);
socket = new Socket();
//socket.debug=true;
socket.bind(0,interface_ip_address);
if(!socket.connect(host,port)) {
	printf("!Error %d connecting to %s port %d\r\n"
		,socket.last_error,host,port);
	delete socket;
	exit();
}
print("Connected");
readln();

if(username!=undefined && username.length) {
	print("Authenticating...");
	writeln(format("AUTHINFO USER %s",username));
	readln();
	if(password!=undefined && password.length) {
		writeln(format("AUTHINFO PASS %s",password));
		rsp = readln();
		if(rsp==null || rsp[0]!='2') {
			printf("!Authentication FAILURE: %s\r\n", rsp);
			delete socket;
			exit();
		}
	}
	print("Authenticated");
}

if(slave) {
	writeln("slave");
	readln();
}

var stop_semaphore=system.data_dir+"newslink.stop";
file_remove(stop_semaphore);

/******************************/
/* Export and Import Messages */
/******************************/
var exported=0;
var imported=0;
var twitlist_fname = system.ctrl_dir + "twitlist.cfg";
var use_twitlist = file_exists(twitlist_fname);

printf("Scanning %lu message bases...\r\n",area.length);
for(i in area) {
	
	if(!socket.is_connected) {
		print("Disconnected");
		break;
	}

	if(js.terminated || file_exists(stop_semaphore))
		break;

//	printf("%s\r\n",area[i].toString());
	
	sub = area[i][1];
	newsgroup = area[i][2];
	flags = area[i][3];
	if(flags==undefined)
		flags="";
	flags += global_flags;
	flags = flags.toLowerCase();

	msgbase = new MsgBase(sub);
	if(msgbase.open!=undefined && msgbase.open()==false) {
		printf("!ERROR %s opening msgbase: %s\r\n",msgbase.last_error,sub);
		delete msgbase;
		continue;
	}

	// Use default newsgroup name if not configured
	if(newsgroup==undefined || newsgroup.length<2)
		newsgroup=msgbase.cfg.newsgroup;

	attachment_dir=area[i][4];
	if(attachment_dir==undefined)
		attachment_dir=msgbase.cfg.data_dir+"attach";
	mkdir(attachment_dir);   
	if(attachment_dir.substr(-1)!='/')
		attachment_dir+="/";   

	printf("sub: %s, newsgroup: %s\r\n",sub,newsgroup);

	/*********************/
	/* Read Pointer File */
	/*********************/
	export_ptr = 0;
	import_ptr = NaN;			// Set to highest possible message number (by default)
	if(flags.indexOf('i')>=0)	// import all
		import_ptr = 0;
	ptr_fname = msgbase.file + ".snl";
	ptr_file = new File(ptr_fname);
	if(ptr_file.open("rb")) {
		export_ptr = ptr_file.readBin();
		printf("%s export ptr: %ld\r\n",sub,export_ptr);
		import_ptr = ptr_file.readBin();
		printf("%s import ptr: %ld\r\n",sub,import_ptr);
		ptr_file.close();
	}

	if(reset_export_ptrs)
		ptr = 0;
	else if(update_export_ptrs)
		ptr = msgbase.last_msg;
	else 
		ptr = export_ptr;

	if(ptr < msgbase.first_msg)
		ptr = msgbase.first_msg;
	else
		ptr++;

	/*************************/
	/* EXPORT Local Messages */
	/*************************/
	if(debug)
		print("exporting local messages");
	last_msg=msgbase.last_msg;
	for(;socket.is_connected 
		&& ptr<=last_msg 
		&& !js.terminated
		&& !file_exists(stop_semaphore)
		;ptr++) {
		if(this.console!=undefined)
			console.line_counter = 0;
		hdr = msgbase.get_msg_header(
			/* retrieve by offset? */	false,
			/* message number */		ptr,
			/* regenerate msg-id? */	false
			);
		if(hdr == null)
			continue;
		if(hdr.attr&MSG_DELETE)	/* marked for deletion */
			continue;
		if(hdr.attr&MSG_MODERATED && !(hdr.attr&MSG_VALIDATED))
			continue;
		if(hdr.attr&MSG_PRIVATE)/* no private messages on NNTP */
			continue;
		if(hdr.from_net_type==NET_INTERNET)	/* no dupe loop */
			continue;
		if(hdr.from_net_type	/* don't gate messages between net types */
			&& msgbase.cfg!=undefined && !(msgbase.cfg.settings&SUB_GATE))
			continue;

		body = msgbase.get_msg_body(
				 false	/* retrieve by offset */
				,ptr	/* message number */
				,true	/* remove ctrl-a codes */
				,true	/* rfc822 formatted text */
				,true	/* include tails */
				);
		if(body == null) {
			printf("!FAILED to read message number %ld\r\n",ptr);
			continue;
		}
		if(msgbase.cfg!=undefined && msgbase.cfg.settings&SUB_ASCII) {
			/* Convert Ex-ASCII chars to approximate ASCII equivalents */
			body = ascii_str(body);
			hdr.subject = ascii_str(hdr.subject);
		}
		if(flags.indexOf('x')==-1) {
			body += tearline;
			body += tagline;
		}
		if(0) 
			writeln(format("IHAVE %s",hdr.id));
		else
			writeln("POST");

		rsp = readln();
		if(rsp==null || rsp[0]!='3') {
			printf("!POST FAILURE: %s\r\n",rsp);
			break;
		}

		if(!email_addresses)
			writeln(format("From: %s@%s",hdr.from,newsgroup));
		else if(hdr.from.indexOf('@')!=-1)
			writeln(format("From: %s%s",hdr.from,antispam));
		else if(hdr.from_net_type && hdr.from_net_addr!=null) {
			if(hdr.from_net_addr.indexOf('@')!=-1)
				writeln(format("From: \"%s\" <%s%s>"
					,hdr.from
					,hdr.from_net_addr,antispam));
			else
				writeln(format("From: \"%s\" <%s@%s%s>"
					,hdr.from
					,hdr.from.replace(/ /g,".").toLowerCase()
					,hdr.from_net_addr,antispam));
		}
		else
			writeln(format("From: \"%s\" <%s@%s%s>"
				,hdr.from
				,hdr.from.replace(/ /g,".").toLowerCase()
				,system.inetaddr,antispam));

		if(hdr.newsgroups==undefined)
			hdr.newsgroups=newsgroup;

		if(hdr.from_org==undefined && !hdr.from_net_type)
			hdr.from_org=system.name;

		write_news_header(hdr,writeln); // from newsutil.js

		writeln("X-Gateway: "
			+ system.inetaddr
			+ " [Synchronet "
			+ system.version + system.revision 
			+ "-" + system.platform + system.beta_version
			+ " NewsLink " + REVISION
			+ "]"
			);

		writeln("");
		if(hdr.to.toLowerCase()!="all") {
			writeln("  To: " + hdr.to);
		}
		write(body);
		writeln(".");
		rsp = readln();
		if(rsp==null || rsp[0]!='2') {
			printf("!POST FAILURE: %s\r\n",rsp);
			break;
		}
		printf("Exported message %lu to newsgroup: %s\r\n",ptr,newsgroup);
		exported++;
	}
	if(ptr > msgbase.last_msg)
		ptr = msgbase.last_msg;
	export_ptr = ptr;

	/***************************/
	/* IMPORT Network Messages */
	/***************************/	

	writeln(format("GROUP %s",newsgroup));
	rsp = readln();
	if(rsp==null || rsp[0]!='2') {
		printf("!GROUP %s FAILURE: %s\r\n",newsgroup,rsp);
		delete ptr_file;
		delete msgbase;
		continue;
	}
	str = rsp.split(' ');

	first_msg = parseInt(str[2]);
	last_msg = parseInt(str[3]);

	if(reset_import_ptrs)
		ptr = 0;
	else if(update_import_ptrs)
		ptr = last_msg;
	else if(import_amount)
		ptr = last_msg - import_amount;
	else
		ptr = import_ptr;

	printf("%s import ptr: %ld, first_msg: %ld, last_msg: %ld\r\n"
		,newsgroup,ptr,first_msg,last_msg);

	if(ptr < first_msg)
		ptr = first_msg;
	else {
		if(ptr > last_msg || isNaN(ptr))
			ptr = last_msg;
		ptr++;
	}

	for(;socket.is_connected 
		&& ptr<=last_msg 
		&& !js.terminated
		&& !file_exists(stop_semaphore)
		;ptr++) {
		if(this.console!=undefined)
			console.line_counter = 0;
		writeln(format("ARTICLE %lu",ptr));
		rsp = readln();
		if(rsp==null || rsp[0]!='2') {
			if(debug)
				printf("!ARTICLE %lu ERROR: %s\r\n",ptr,rsp);
			continue;
		}
		body="";
		header=true;
		var hdr={ from: "", to: newsgroup, subject: "", id: "" };
		var line;
		var line_counter=0;
		var recv_lines=0;
        var file=undefined;   
        var md5; 
		while(socket.is_connected) {

			if(recv_lines && lines_per_yield && (recv_lines%lines_per_yield)==0)
				sleep(yield_length);

			line = socket.recvline(512 /*maxlen*/, 300 /*timeout*/);

			if(line==null) {
				print("!TIMEOUT waiting for text line\r\n");
				break;
			}

			recv_lines++;

			//printf("msgtxt: %s\r\n",line);

			if(line==".") {
//				print("End of message text");
				break;
			}
			if(line=="" && header) {
				header=false;
				continue;
			}

			if(header) {
				parse_news_header(hdr,line);	// from newsutil.js
				continue;
			}

			/* Body text, append to 'body' */
			if(line.charAt(0)=='.')
				line=line.slice(1);		// Skip prepended dots

			body += line+"\r\n";
			line_counter++;

            if(flags.indexOf('b')>=0) {        // decode attachments
				if(file==undefined
					&& line.substr(0,8)=="=ybegin " 
					&& line.indexOf(" line=")>0
					&& (size=line.indexOf(" size="))>0
					&& (name=line.indexOf(" name="))>0) {

					printf("yenc header: %s\r\n",line);

					size=parseInt(line.slice(size+6),10);
					fname=file_getname(line.slice(name+6));

					if((total=line.indexOf(" total="))>0)
						total=parseInt(line.slice(total+7),10);

					if(total>1)	/* multipart */
						continue;

					/* part? */
					if((part=line.indexOf(" part="))>0)
						part=parseInt(line.slice(part+6),10);

					if(part>1) /* multipart */
						continue;

					if(part>0) {

						line = socket.recvline(512 /*maxlen*/, 300 /*timeout*/);

						body += line+"\r\n";

						printf("ypart header: %s\r\n",line);

						if(line.substr(0,7)!="=ypart "
							|| (begin=line.indexOf(" begin="))<1
							|| (end=line.indexOf(" end="))<1) {
							printf("!yEnc MALFORMED ypart line: %s\r\n",line);
							continue;
						}
						if(begin!=1 || end!=size)	/* multipart */
							continue;
					}

					fname=unique_fname(attachment_dir,fname);
                    file=new File(fname);   
                    file.yenc=true;   
                    if(file.open("w+b"))   
                        printf("Receiving/decoding attachment: %s\r\n",file.name);
                    else   
                        printf("!ERROR %s opening %s\r\n",errno_str,file.name);
                    continue;   
				}	

                if(file==undefined && line.substr(0,6)=="begin ") {   
					 // Parse uuencode header   
					 arg=line.split(/\s+/);   
					 arg.splice(0,2);        // strip "begin 666 "   
					 fname=file_getname(arg.join(" "));   
					 fname=unique_fname(attachment_dir,fname);    
                     file=new File(fname);   
                     file.uue=true;   
                     if(file.open("w+b"))   
                         printf("Receiving/decoding attachment: %s\r\n",file.name);   
                     else   
                         printf("!ERROR %s opening %s\r\n",errno_str,file.name);
                     continue;   
                 }    
                 if(file!=undefined && file.is_open==true) {   
                    if(file.uue && line=="end") {   
                         md5=file.md5_hex;   
                         file.close();
						 continue;
					}
					if(file.yenc && line.substr(0,6)=="=yend "
						&& (part_size=line.indexOf(" size="))>0) {
						part_size=parseInt(line.slice(part_size+6),10);
						if(part_size!=size)	{ /* multi-part, ignore */
							file.remove();
							delete file;
							continue;
						}
						if((crc32=line.indexOf(" pcrc32="))>0)
							crc32=parseInt(line.slice(crc32+8),16);
						else if((crc32=line.indexOf(" crc32="))>0)
							crc32=parseInt(line.slice(crc32+7),16);
						else
							crc32=undefined;

						if(crc32!=undefined) {
							file_crc32=file.crc32;
							if(crc32!=file_crc32) {
								printf("!yEnc CRC-32 mismatch, actual: %08lX, trailer: %s\r\n"
									,file_crc32,line);
								file.remove();
								delete file;
								continue;
							}
						}

						md5=file.md5_hex;
						file.close();
						continue;
					}

					if(!file.write(line))   
						printf("!ERROR decoding/writing: %s\r\n",line);   
				}
			}
			//print(line);
		}
			
        if(file!=undefined) {   
            if(file.is_open==true) { /* Incomplete attachment? */
				print("!Incomplete attachment: " + file_getname(file.name));
                file.remove();
            } else {
				/* Search for duplicate MD5 */
				print("Searching for duplicate file");
				var duplicate=false;
				md5_file=new File(attachment_dir + "md5.lst");
				if(md5_file.open("r")) {
					while(!md5_file.eof && !duplicate) {
						str=md5_file.readln();
						if(str==null)
							break;
						if(str.substr(0,32)==md5)
							duplicate=true;
					}
					md5_file.close();
				}
				if(duplicate) {   
					printf("Duplicate MD5 digest found: %s\r\n",str);   
					if(file_remove(file.name))   
						printf("Duplicate file removed: %s\r\n",file.name);   
					else   
						printf("!ERROR removing duplicate file: %s\r\n",file.name);   
					continue;   
				}
				/* Append MD5 to history file */
				if(md5_file.open("a")) {
					md5_file.printf("%s %s\n",md5,file_getname(file.name));
					md5_file.close();
				} else
					printf("!ERROR %d (%s) creating/appending %s\r\n"
						,errno, errno_str, md5_file.name);
				continue;
			}
        } 
		
		if(truncsp(body).length==0) {
			printf("Message %lu not imported (blank)\r\n",ptr);
			continue;
		}

		if(max_newsgroups_per_article && hdr.newsgroups!=undefined) {
			var ngarray=hdr.newsgroups.split(',');
			if(ngarray.length>max_newsgroups_per_article) {
				var reason = format("Too many newsgroups (%d): %s",ngarray.length, hdr.newsgroups);
				printf("!%s\r\n",reason);
				system.spamlog("NNTP","NOT IMPORTED",reason,hdr.from,host,hdr.to);
				continue;
			}
		}

		if(hdr.to==newsgroup && hdr.newsgroups!=undefined)
			hdr.to=hdr.newsgroups;

		// Duplicate/looped message detection here
		if(hdr.id.indexOf('@' + system.inetaddr)!=-1)
			continue;
		if(hdr.path
			&& hdr.path.indexOf(system.inetaddr)!=-1)
			continue;
		if(hdr.gateway
			&& hdr.gateway.indexOf(system.inetaddr)!=-1)
			continue;

		if(flags.indexOf('s')==-1 && system.trashcan("subject",hdr.subject)) {
			var reason = format("Blocked subject (%s)",hdr.subject);
			printf("!%s\r\n",reason);
			system.spamlog("NNTP","NOT IMPORTED",reason,hdr.from,host,hdr.to);
			continue;
		}
		if(use_twitlist 
			&& (system.findstr(twitlist_fname,hdr.from) 
				|| system.findstr(twitlist_fname,hdr.to))) {
			printf("Filtering message from %s to %s\r\n", hdr.from, hdr.to);
			continue;
		}

		if(flags.indexOf('n')==-1)
			body=format("\1n\1b\1hFrom Newsgroup\1n\1b: \1h\1c%s\1n\r\n\r\n",newsgroup) + body;

		if(flags.indexOf('a')>=0) {	// import ASCII only (convert ex-ASCII to ASCII)
			body = ascii_str(body);
			hdr.subject = ascii_str(hdr.subject);
		}
		if(flags.indexOf('r')>=0) 	// remove "Newsgroups:" header field
			delete hdr.newsgroups;

		hdr.from_net_type=NET_INTERNET;
//		hdr.from_net_addr=hdr.from;
		if(flags.indexOf('t')==-1)
			body += tearline;
		if(msgbase.save_msg(hdr,body)) {
			imported++;
			printf("Message %lu imported into %s (%lu of %lu total) %lu lines\r\n"
				,ptr, sub, imported, msgbase.total_msgs, line_counter);
		} else
			printf("!IMPORT %lu ERROR: %s\r\n", ptr, msgbase.last_error);
	}

	if(ptr > last_msg)
		ptr = last_msg;
	import_ptr = ptr;

	/* Save Pointers */
	if(!ptr_file.open("wb"))
		printf("!ERROR %d creating/opening %s\r\n",errno,ptr_fname);
	else {
		ptr_file.writeBin(export_ptr);
		ptr_file.writeBin(import_ptr);
		ptr_file.close();
	}
	delete ptr_file;
	delete msgbase;

//	if(flags.indexOf('b')>=0)	// binary newsgroup
//		load("binarydecoder.js",sub);
}

writeln("quit");
readln();

delete socket;

printf("Synchronet NewsLink %s session complete (%lu exported, %lu imported)\r\n"
	   ,REVISION, exported, imported);

/* End of newslink.js */
