load("sbbsdefs.js");	// CON_RAW_IN

function test() 
{
	var socket = new Socket();

	socket.debug=true;

	if(!socket.bind()) {
		printf("!bind error %d\r\n",socket.last_error);
		exit();
	}

	var addr=prompt("address");
	var port=Number(prompt("port"));

	if(!socket.connect(addr,port)) {
		printf("!connect error %d\r\n",socket.last_error);
		exit();
	}

	printf("\r\nConnected to %s:%d - Ctrl-] to abort\r\n",addr,port);
	console.pause();

	while(socket.is_connected && client.socket.is_connected) {
		if(socket.data_waiting) {
			buf = socket.read();
			client.socket.write(buf);
			continue;
		}
		if((input=console.inkey())!="") {
			if(input=="\x1d")	/* Ctrl-] */
				break;
			socket.write(input);
			continue;
		}
		sleep(1);
	}
}

console.status |= CON_RAW_IN;		// Enable RAW input mode (pass-through ctrl chars)
test();
console.status &= ~CON_RAW_IN;		// Disable raw input mode

print("\r\nEnd of socktest!\r\n");