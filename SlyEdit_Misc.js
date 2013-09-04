/* This file declares some general helper functions and variables
 * that are used by SlyEdit.
 *
 * Author: Eric Oulashin (AKA Nightfox)
 * BBS: Digital Distortion
 * BBS address: digdist.bbsindex.com
 *
 * Date       User              Description
 * 2009-06-06 Eric Oulashin     Started development
 * 2009-06-11 Eric Oulashin     Taking a break from development
 * 2009-08-09 Eric Oulashin     Started more development & testing
 * 2009-08-22 Eric Oulashin     Version 1.00
 *                              Initial public release
 * ....Removed some comments...
 * 2013-08-24 Eric Oulashin     Bug fix in wrapQuoteLines(): Off-by-one bug toward
 *                              the end where there might be more quote lines
 *                              than lineInfo objects, so it wouldn't quote the
 *                              last line when using author initials.
 * 2013-08-28 Eric Oulashin     Updated ReadSlyEditConfigFile() to read and
 *                              set the enableTextReplacements setting.  It
 *                              defaults to false.  Also added populateTxtReplacements().
 *                              Added moveGenColorsToGenSettings(), which
 *                              can be called by JavaScripts for different
 *                              UI styles to move the general color settings
 *                              from their own color array into the genColors
 *                              array in the configuration object.
 * 2013-08-31 Eric Oulashin     Added the function getWordFromEditLine().
 * 2013-09-02 Eric Oulashin     Worked on the new function doMacroTxtReplacementInEditLine(),
 *                              which performs text replacement (AKA macros) on
 *                              one of the message edit lines.  Added
 *                              genFullPathCfgFilename() so that the logic for finding
 *                              the configuration files is all in one place.  Added
 *                              getFirstLetterFromStr() and firstLetterIsUppercase(),
 *                              which are helpers for doMacroTxtReplacementInEditLine()
 *                              for checking & fixing first-letter capitalization
 *                              after doing a regex replace.
 * 2013-09-03 Eric Oulashin     Updated populateTxtReplacements() so that it won't
 *                              force the replacement text strings to lowercase
 *                              when not using regular expressions.  Also made
 *                              use of strip_ctrl() with the replacement text to
 *                              prevent the use of color codes, which might mess
 *                              up SlyEdit's tracking of string indexes, etc.
 *                              Updated doMacroTxtReplacementInEditLine() so
 *                              that macro text replacements won't lowercase the
 *                              replacement text when in literal match & replace
 *                              mode.
 *                              
 */

// Note: These variables are declared with "var" instead of "const" to avoid
// multiple declaration errors when this file is loaded more than once.

// Values for attribute types (for text attribute substitution)
var FORE_ATTR = 1; // Foreground color attribute
var BKG_ATTR = 2;  // Background color attribute
var SPECIAL_ATTR = 3; // Special attribute

// Box-drawing/border characters: Single-line
var UPPER_LEFT_SINGLE = "�";
var HORIZONTAL_SINGLE = "�";
var UPPER_RIGHT_SINGLE = "�";
var VERTICAL_SINGLE = "�";
var LOWER_LEFT_SINGLE = "�";
var LOWER_RIGHT_SINGLE = "�";
var T_SINGLE = "�";
var LEFT_T_SINGLE = "�";
var RIGHT_T_SINGLE = "�";
var BOTTOM_T_SINGLE = "�";
var CROSS_SINGLE = "�";
// Box-drawing/border characters: Double-line
var UPPER_LEFT_DOUBLE = "�";
var HORIZONTAL_DOUBLE = "�";
var UPPER_RIGHT_DOUBLE = "�";
var VERTICAL_DOUBLE = "�";
var LOWER_LEFT_DOUBLE = "�";
var LOWER_RIGHT_DOUBLE = "�";
var T_DOUBLE = "�";
var LEFT_T_DOUBLE = "�";
var RIGHT_T_DOUBLE = "�";
var BOTTOM_T_DOUBLE = "�";
var CROSS_DOUBLE = "�";
// Box-drawing/border characters: Vertical single-line with horizontal double-line
var UPPER_LEFT_VSINGLE_HDOUBLE = "�";
var UPPER_RIGHT_VSINGLE_HDOUBLE = "�";
var LOWER_LEFT_VSINGLE_HDOUBLE = "�";
var LOWER_RIGHT_VSINGLE_HDOUBLE = "�";
// Other special characters
var DOT_CHAR = "�";
var CHECK_CHAR = "�";
var THIN_RECTANGLE_LEFT = "�";
var THIN_RECTANGLE_RIGHT = "�";
var BLOCK1 = "�"; // Dimmest block
var BLOCK2 = "�";
var BLOCK3 = "�";
var BLOCK4 = "�"; // Brightest block

// Navigational keys
var UP_ARROW = "";
var DOWN_ARROW = "";
// CTRL keys
var CTRL_A = "\x01";
var CTRL_B = "\x02";
//var KEY_HOME = CTRL_B;
var CTRL_C = "\x03";
var CTRL_D = "\x04";
var CTRL_E = "\x05";
//var KEY_END = CTRL_E;
var CTRL_F = "\x06";
//var KEY_RIGHT = CTRL_F;
var CTRL_G = "\x07";
var BEEP = CTRL_G;
var CTRL_H = "\x08";
var BACKSPACE = CTRL_H;
var CTRL_I = "\x09";
var TAB = CTRL_I;
var CTRL_J = "\x0a";
//var KEY_DOWN = CTRL_J;
var CTRL_K = "\x0b";
var CTRL_L = "\x0c";
var INSERT_LINE = CTRL_L;
var CTRL_M = "\x0d";
var CR = CTRL_M;
var KEY_ENTER = CTRL_M;
var CTRL_N = "\x0e";
var CTRL_O = "\x0f";
var CTRL_P = "\x10";
var CTRL_Q = "\x11";
var XOFF = CTRL_Q;
var CTRL_R = "\x12";
var CTRL_S = "\x13";
var XON = CTRL_S;
var CTRL_T = "\x14";
var CTRL_U = "\x15";
var CTRL_V = "\x16";
var KEY_INSERT = CTRL_V;
var CTRL_W = "\x17";
var CTRL_X = "\x18";
var CTRL_Y = "\x19";
var CTRL_Z = "\x1a";
var KEY_ESC = "\x1b";

// Store the full path & filename of the Digital Distortion Message
// Lister, since it will be used more than once.
var gDDML_DROP_FILE_NAME = system.node_dir + "DDML_SyncSMBInfo.txt";

///////////////////////////////////////////////////////////////////////////////////
// Object/class stuff

// TextLine object constructor: This is used to keep track of a text line,
// and whether it has a hard newline at the end (i.e., if the user pressed
// enter to break the line).
//
// Parameters (all optional):
//  pText: The text for the line
//  pHardNewlineEnd: Whether or not the line has a "hard newline" - What
//                   this means is that text below it won't be wrapped up
//                   to this line when re-adjusting the text lines.
//  pIsQuoteLine: Whether or not the line is a quote line.
function TextLine(pText, pHardNewlineEnd, pIsQuoteLine)
{
	this.text = "";               // The line text
	this.hardNewlineEnd = false; // Whether or not the line has a hard newline at the end
	this.isQuoteLine = false;    // Whether or not this is a quote line
   // Copy the parameters if they are valid.
   if ((pText != null) && (typeof(pText) == "string"))
      this.text = pText;
   if ((pHardNewlineEnd != null) && (typeof(pHardNewlineEnd) == "boolean"))
      this.hardNewlineEnd = pHardNewlineEnd;
   if ((pIsQuoteLine != null) && (typeof(pIsQuoteLine) == "boolean"))
      this.isQuoteLine = pIsQuoteLine;

	// NEW & EXPERIMENTAL:
   // For color support
   this.attrs = new Array(); // An array of attributes for the line
   // Functions
   this.length = TextLine_Length;
   this.print = TextLine_Print;
}
// For the TextLine class: Returns the length of the text.
function TextLine_Length()
{
   return this.text.length;
}
// For  the TextLine class: Prints the text line, using its text attributes.
//
// Parameters:
//  pClearToEOL: Boolean - Whether or not to clear to the end of the line
function TextLine_Print(pClearToEOL)
{
   console.print(this.text);

   if (pClearToEOL)
      console.cleartoeol();
}

// AbortConfirmFuncParams constructor: This object contains parameters used by
// the abort confirmation function (actually, there are separate ones for
// IceEdit and DCT Edit styles).
function AbortConfirmFuncParams()
{
   this.editTop = gEditTop;
   this.editBottom = gEditBottom;
   this.editWidth = gEditWidth;
   this.editHeight = gEditHeight;
   this.editLinesIndex = gEditLinesIndex;
   this.displayMessageRectangle = displayMessageRectangle;
}


///////////////////////////////////////////////////////////////////////////////////
// Functions

// This function takes a string and returns a copy of the string
// with a color randomly alternating between dim & bright versions.
//
// Parameters:
//  pString: The string to convert
//  pColor: The color to use (Synchronet color code)
function randomDimBrightString(pString, pColor)
{
	// Return if an invalid string is passed in.
	if (pString == null)
		return "";
	if (typeof(pString) != "string")
		return "";

   // Set the color.  Default to green.
	var color = "g";
	if ((pColor != null) && (typeof(pColor) != "undefined"))
      color = pColor;

   return(randomTwoColorString(pString, "n" + color, "nh" + color));
}

// This function takes a string and returns a copy of the string
// with colors randomly alternating between two given colors.
//
// Parameters:
//  pString: The string to convert
//  pColor11: The first color to use (Synchronet color code)
//  pColor12: The second color to use (Synchronet color code)
function randomTwoColorString(pString, pColor1, pColor2)
{
	// Return if an invalid string is passed in.
	if (pString == null)
		return "";
	if (typeof(pString) != "string")
		return "";

	// Set the colors.  Default to green.
	var color1 = "ng";
	if ((pColor1 != null) && (typeof(pColor1) != "undefined"))
      color1 = pColor1;
   var color2 = "ngh";
	if ((pColor2 != null) && (typeof(pColor2) != "undefined"))
      color2 = pColor2;

	// Create a copy of the string without any control characters,
	// and then add our coloring to it.
	pString = strip_ctrl(pString);
	var returnString = color1;
	var useColor1 = false;     // Whether or not to use the useColor1 version of the color1
	var oldUseColor1 = useColor1; // The value of useColor1 from the last pass
	for (var i = 0; i < pString.length; ++i)
	{
		// Determine if this character should be useColor1
		useColor1 = (Math.floor(Math.random()*2) == 1);
		if (useColor1 != oldUseColor1)
         returnString += (useColor1 ? color1 : color2);

		// Append the character from pString.
		returnString += pString.charAt(i);

		oldUseColor1 = useColor1;
	}

	return returnString;
}

// Returns the current time as a string, to be displayed on the screen.
function getCurrentTimeStr()
{
	var timeStr = strftime("%I:%M%p", time());
	timeStr = timeStr.replace("AM", "a");
	timeStr = timeStr.replace("PM", "p");
	
	return timeStr;
}

// Returns whether or not a character is printable.
function isPrintableChar(pText)
{
   // Make sure pText is valid and is a string.
   if (typeof(pText) != "string")
      return false;
   if (pText.length == 0)
      return false;

   // Make sure the character is a printable ASCII character in the range of 32 to 254,
   // except for 127 (delete).
   var charCode = pText.charCodeAt(0);
   return ((charCode > 31) && (charCode < 255) && (charCode != 127));
}

// Removes multiple, leading, and/or trailing spaces
// The search & replace regular expressions used in this
// function came from the following URL:
//  http://qodo.co.uk/blog/javascript-trim-leading-and-trailing-spaces
//
// Parameters:
//  pString: The string to trim
//  pLeading: Whether or not to trim leading spaces (optional, defaults to true)
//  pMultiple: Whether or not to trim multiple spaces (optional, defaults to true)
//  pTrailing: Whether or not to trim trailing spaces (optional, defaults to true)
//
// Return value: The trimmed string
function trimSpaces(pString, pLeading, pMultiple, pTrailing)
{
   // Make sure pString is a string.
   if (typeof(pString) == "string")
   {
      var leading = true;
      var multiple = true;
      var trailing = true;
      if(typeof(pLeading) != "undefined")
         leading = pLeading;
      if(typeof(pMultiple) != "undefined")
         multiple = pMultiple;
      if(typeof(pTrailing) != "undefined")
         trailing = pTrailing;

      // To remove both leading & trailing spaces:
      //pString = pString.replace(/(^\s*)|(\s*$)/gi,"");

      if (leading)
         pString = pString.replace(/(^\s*)/gi,"");
      if (multiple)
         pString = pString.replace(/[ ]{2,}/gi," ");
      if (trailing)
         pString = pString.replace(/(\s*$)/gi,"");
   }

   return pString;
}

// Displays the text to display above help screens.
function displayHelpHeader()
{
   // Construct the header text lines only once.
   if (typeof(displayHelpHeader.headerLines) == "undefined")
   {
      displayHelpHeader.headerLines = new Array();

      var headerText = EDITOR_PROGRAM_NAME + " Help w(y"
                      + (EDITOR_STYLE == "DCT" ? "DCT" : "Ice")
                      + " modew)";
      var headerTextLen = strip_ctrl(headerText).length;

      // Top border
      var headerTextStr = "nhc" + UPPER_LEFT_SINGLE;
      for (var i = 0; i < headerTextLen + 2; ++i)
         headerTextStr += HORIZONTAL_SINGLE;
      headerTextStr += UPPER_RIGHT_SINGLE;
      displayHelpHeader.headerLines.push(headerTextStr);

      // Middle line: Header text string
      headerTextStr = VERTICAL_SINGLE + "4y " + headerText + " nhc"
                    + VERTICAL_SINGLE;
      displayHelpHeader.headerLines.push(headerTextStr);

      // Lower border
      headerTextStr = LOWER_LEFT_SINGLE;
      for (var i = 0; i < headerTextLen + 2; ++i)
         headerTextStr += HORIZONTAL_SINGLE;
      headerTextStr += LOWER_RIGHT_SINGLE;
      displayHelpHeader.headerLines.push(headerTextStr);
   }

   // Print the header strings
   for (var index in displayHelpHeader.headerLines)
      console.center(displayHelpHeader.headerLines[index]);
}

// Displays the command help.
//
// Parameters:
//  pDisplayHeader: Whether or not to display the help header.
//  pClear: Whether or not to clear the screen first
//  pPause: Whether or not to pause at the end
//  pCanCrossPost: Whether or not cross-posting is enabled
//  pIsSysop: Whether or not the user is the sysop.
//  pTxtReplacments: Whether or not the text replacements feature is enabled
function displayCommandList(pDisplayHeader, pClear, pPause, pCanCrossPost, pIsSysop, pTxtReplacments)
{
   if (pClear)
      console.clear("n");
   if (pDisplayHeader)
   {
      displayHelpHeader();
      console.crlf();
   }

   var isSysop = (pIsSysop != null ? pIsSysop : user.compare_ars("SYSOP"));

   // This function displays a key and its description with formatting & colors.
   //
   // Parameters:
   //  pKey: The key description
   //  pDesc: The description of the key's function
   //  pCR: Whether or not to display a carriage return (boolean).  Optional;
   //       if not specified, this function won't display a CR.
   function displayCmdKeyFormatted(pKey, pDesc, pCR)
   {
      printf("ch%-13sg: nc%s", pKey, pDesc);
      if (pCR)
         console.crlf();
   }
   // This function does the same, but outputs 2 on the same line.
   function displayCmdKeyFormattedDouble(pKey, pDesc, pKey2, pDesc2, pCR)
   {
      var sepChar1 = ":";
      var sepChar2 = ":";
      if ((pKey.length == 0) && (pDesc.length == 0))
         sepChar1 = " ";
      if ((pKey2.length == 0) && (pDesc2.length == 0))
         sepChar2 = " ";
      printf("ch%-13sg" + sepChar1 + " nc%-28s kh" + VERTICAL_SINGLE +
             " ch%-7sg" + sepChar2 + " nc%s", pKey, pDesc, pKey2, pDesc2);
      if (pCR)
         console.crlf();
   }

   // Help keys and slash commands
   printf("ng%-44s  %-33s\r\n", "Help keys", "Slash commands (on blank line)");
   printf("kh%-44s  %-33s\r\n", "���������", "������������������������������");
   displayCmdKeyFormattedDouble("Ctrl-G", "General help", "/A", "Abort", true);
   displayCmdKeyFormattedDouble("Ctrl-P", "Command key help", "/S", "Save", true);
   displayCmdKeyFormattedDouble("Ctrl-R", "Program information", "/Q", "Quote message", true);
   if (pTxtReplacments)
      displayCmdKeyFormattedDouble("Ctrl-T", "List text replacements", "/T", "List text replacements", true);
   if (pCanCrossPost)
      displayCmdKeyFormattedDouble("", "", "/C", "Cross-post selection", true);
   printf(" ch%-7sg  nc%s", "", "", "/?", "Show help");
   console.crlf();
   // Command/edit keys
   console.print("ngCommand/edit keys\r\nkh�����������������\r\n");
   displayCmdKeyFormattedDouble("Ctrl-A", "Abort message", "Ctrl-W", "Page up", true);
   displayCmdKeyFormattedDouble("Ctrl-Z", "Save message", "Ctrl-S", "Page down", true);
   displayCmdKeyFormattedDouble("Ctrl-Q", "Quote message", "Ctrl-N", "Find text", true);
   displayCmdKeyFormattedDouble("Insert/Ctrl-I", "Toggle insert/overwrite mode",
                                "Ctrl-D", "Delete line", true);
   if (pCanCrossPost)
      displayCmdKeyFormattedDouble("ESC", "Command menu", "Ctrl-C", "Cross-post selection", true);
   else
      displayCmdKeyFormatted("ESC", "Command menu", true);
   if (isSysop)
      displayCmdKeyFormattedDouble("Ctrl-O", "Import a file", "Ctrl-X", "Export to file", true);

   if (pPause)
      console.pause();
}

// Displays the general help screen.
//
// Parameters:
//  pDisplayHeader: Whether or not to display the help header.
//  pClear: Whether or not to clear the screen first
//  pPause: Whether or not to pause at the end
function displayGeneralHelp(pDisplayHeader, pClear, pPause)
{
   if (pClear)
      console.clear("n");
   if (pDisplayHeader)
      displayHelpHeader();

   console.print("ncSlyEdit is a full-screen message editor that mimics the look & feel of\r\n");
   console.print("IceEdit or DCT Edit, two popular editors.  The editor is currently in " +
                 (EDITOR_STYLE == "DCT" ? "DCT" : "Ice") + "\r\nmode.\r\n");
   console.print("At the top of the screen, information about the message being written (or\r\n");
   console.print("file being edited) is displayed.  The middle section is the edit area,\r\n");
   console.print("where the message/file is edited.  Finally, the bottom section displays\r\n");
   console.print("some of the most common keys and/or status.");
   console.crlf();
   if (pPause)
      console.pause();
}

// Displays program information.
//
// Parameters:
//  pClear: Whether or not to clear the screen first
//  pPause: Whether or not to pause at the end
function displayProgramInfo(pClear, pPause)
{
   if (pClear)
      console.clear("n");

   // Print the program information
   console.center("nhc" + EDITOR_PROGRAM_NAME + "n cVersion g" +
                  EDITOR_VERSION + " wh(b" + EDITOR_VER_DATE + "w)");
   console.center("ncby Eric Oulashin");
   console.crlf();
   console.print("ncSlyEdit is a full-screen message editor for Synchronet that mimics the look &\r\n");
   console.print("feel of IceEdit or DCT Edit.");
   console.crlf();
   if (pPause)
      console.pause();
}

// Displays the informational screen for the program exit.
//
// Parameters:
//  pClearScreen: Whether or not to clear the screen.
function displayProgramExitInfo(pClearScreen)
{
	if (pClearScreen)
		console.clear("n");

	/*console.print("ncYou have been using:\r\n");
	console.print("hk�7����������������������������������0�\r\n");
	console.print("�7 nb7����� �       �����    � �       hk0�\r\n");
	console.print("�7 nb7����  � �   � ����   ��� � ����� hk0�\r\n");
	console.print("�7     nb7� � �   � �     �  � �   �   hk0�\r\n");
	console.print("�7 nb7����  �  ���  �����  ��� �   ��� hk0�\r\n");
	console.print("�7         nb7��                       hk0�\r\n");
	console.print("�7        nb7�                         hk0�\r\n");
	console.print("������������������������������������\r\n");
	console.print("ngVersion hy" + EDITOR_VERSION + " nm(" +
	              EDITOR_VER_DATE + ")");*/
	console.print("ncYou have been using hSlyEdit ncversion g" + EDITOR_VERSION +
	              " nm(" + EDITOR_VER_DATE + ")");
	console.crlf();
	console.print("ncby Eric Oulashin of chDncigital hDncistortion hBncBS");
	console.crlf();
	console.crlf();
	console.print("ncAcknowledgements for look & feel go to the following people:");
	console.crlf();
	console.print("Dan Traczynski: Creator of DCT Edit");
	console.crlf();
	console.print("Jeremy Landvoigt: Original creator of IceEdit");
	console.crlf();
}

// Writes some text on the screen at a given location with a given pause.
//
// Parameters:
//  pX: The column number on the screen at which to write the message
//  pY: The row number on the screen at which to write the message
//  pText: The text to write
//  pPauseMS: The pause time, in milliseconds
//  pClearLineAttrib: Optional - The color/attribute to clear the line with.
//                    If not specified, defaults to normal attribute.
function writeWithPause(pX, pY, pText, pPauseMS, pClearLineAttrib)
{
   var clearLineAttrib = "n";
   if ((pClearLineAttrib != null) && (typeof(pClearLineAttrib) == "string"))
      clearLineAttrib = pClearLineAttrib;
   console.gotoxy(pX, pY);
   console.cleartoeol(clearLineAttrib);
   console.print(pText);
   mswait(pPauseMS);
}

// Prompts the user for a yes/no question.
//
// Parameters:
//  pQuestion: The question to ask the user
//  pDefaultYes: Boolean - Whether or not the default should be Yes.
//               For false, the default will be No.
//  pBoxTitle: For DCT mode, this specifies the title to use for the
//             prompt box.  This is optional; if this is left out,
//             the prompt box title will default to "Prompt".
//
// Return value: Boolean - true for a "Yes" answer, false for "No"
function promptYesNo(pQuestion, pDefaultYes, pBoxTitle)
{
   var userResponse = pDefaultYes;

   if (EDITOR_STYLE == "DCT")
   {
      // We need to create an object of parameters to pass to the DCT-style
      // Yes/No function.
      var paramObj = new AbortConfirmFuncParams();
      paramObj.editLinesIndex = gEditLinesIndex;
      if (typeof(pBoxTitle) == "string")
         userResponse = promptYesNo_DCTStyle(pQuestion, pBoxTitle, pDefaultYes, paramObj);
      else
         userResponse = promptYesNo_DCTStyle(pQuestion, "Prompt", pDefaultYes, paramObj);
   }
   else if (EDITOR_STYLE == "ICE")
   {
      const originalCurpos = console.getxy();
      // Go to the bottom line on the screen and prompt the user
      console.gotoxy(1, console.screen_rows);
      console.cleartoeol();
      console.gotoxy(1, console.screen_rows);
      userResponse = promptYesNo_IceStyle(pQuestion, pDefaultYes);
      // If the user chose "No", then re-display the bottom help line and
      // move the cursor back to its original position.
      if (!userResponse)
      {
         fpDisplayBottomHelpLine(console.screen_rows, gUseQuotes);
         console.gotoxy(originalCurpos);
      }
   }

   return userResponse;
}

// Reads the SlyEdit configuration settings from SlyEdit.cfg.
//
// Return value: An object containing the settings as properties.
function ReadSlyEditConfigFile()
{
   var cfgObj = new Object(); // Configuration object

   // Default settings
   cfgObj.thirdPartyLoadOnStart = new Array();
   cfgObj.runJSOnStart = new Array();
   cfgObj.thirdPartyLoadOnExit = new Array();
   cfgObj.runJSOnExit = new Array();
   cfgObj.displayEndInfoScreen = true;
   cfgObj.userInputTimeout = true;
   cfgObj.inputTimeoutMS = 300000;
   cfgObj.reWrapQuoteLines = true;
   cfgObj.allowColorSelection = true;
   cfgObj.useQuoteLineInitials = true;
   // The next setting specifies whether or not quote lines
   // should be prefixed with a space when using author
   // initials.
   cfgObj.indentQuoteLinesWithInitials = true;
   cfgObj.allowCrossPosting = true;
   cfgObj.enableTextReplacements = false;
   cfgObj.textReplacementsUseRegex = false;

   // General SlyEdit color settings
   cfgObj.genColors = new Object();
   // Cross-posting UI element colors
   // Deprecated colors:
   //cfgObj.genColors.crossPostBorder = "ng";
   //cfgObj.genColors.crossPostBorderTxt = "nbh";
   cfgObj.genColors.listBoxBorder = "ng";
   cfgObj.genColors.listBoxBorderText = "nbh";
   cfgObj.genColors.crossPostMsgAreaNum = "nhw";
   cfgObj.genColors.crossPostMsgAreaNumHighlight = "n4hw";
   cfgObj.genColors.crossPostMsgAreaDesc = "nc";
   cfgObj.genColors.crossPostMsgAreaDescHighlight = "n4c";
   cfgObj.genColors.crossPostChk = "nhy";
   cfgObj.genColors.crossPostChkHighlight = "n4hy";
   cfgObj.genColors.crossPostMsgGrpMark = "nhg";
   cfgObj.genColors.crossPostMsgGrpMarkHighlight = "n4hg";
   // Colors for certain output strings
   cfgObj.genColors.msgWillBePostedHdr = "nc";
   cfgObj.genColors.msgPostedGrpHdr = "nhb";
   cfgObj.genColors.msgPostedSubBoardName = "ng";
   cfgObj.genColors.msgPostedOriginalAreaText = "nc";
   cfgObj.genColors.msgHasBeenSavedText = "nhc";
   cfgObj.genColors.msgAbortedText = "nmh";
   cfgObj.genColors.emptyMsgNotSentText = "nmh";
   cfgObj.genColors.genMsgErrorText = "nmh";

   // Default Ice-style colors
   cfgObj.iceColors = new Object();
   // Ice color theme file
   cfgObj.iceColors.ThemeFilename = genFullPathCfgFilename("SlyIceColors_BlueIce.cfg", gStartupPath);
   // Text edit color
   cfgObj.iceColors.TextEditColor = "nw";
   // Quote line color
   cfgObj.iceColors.QuoteLineColor = "nc";
   // Ice colors for the quote window
   cfgObj.iceColors.QuoteWinText = "nhw";            // White
   cfgObj.iceColors.QuoteLineHighlightColor = "4hc"; // High cyan on blue background
   cfgObj.iceColors.QuoteWinBorderTextColor = "nch"; // Bright cyan
   cfgObj.iceColors.BorderColor1 = "nb";              // Blue
   cfgObj.iceColors.BorderColor2 = "nbh";          // Bright blue
   // Ice colors for multi-choice prompts
   cfgObj.iceColors.SelectedOptionBorderColor = "nbh4";
   cfgObj.iceColors.SelectedOptionTextColor = "nch4"
   cfgObj.iceColors.UnselectedOptionBorderColor = "nb";
   cfgObj.iceColors.UnselectedOptionTextColor = "nw";
   // Ice colors for the top info area
   cfgObj.iceColors.TopInfoBkgColor = "4";
   cfgObj.iceColors.TopLabelColor = "ch";
   cfgObj.iceColors.TopLabelColonColor = "bh";
   cfgObj.iceColors.TopToColor = "wh";
   cfgObj.iceColors.TopFromColor = "wh";
   cfgObj.iceColors.TopSubjectColor = "wh";
   cfgObj.iceColors.TopTimeColor = "gh";
   cfgObj.iceColors.TopTimeLeftColor = "gh";
   cfgObj.iceColors.EditMode = "ch";
   cfgObj.iceColors.KeyInfoLabelColor = "ch";

   // Default DCT-style colors
   cfgObj.DCTColors = new Object();
   // DCT color theme file
   cfgObj.DCTColors.ThemeFilename = genFullPathCfgFilename("SlyDCTColors_Default.cfg", gStartupPath);
   // Text edit color
   cfgObj.DCTColors.TextEditColor = "nw";
   // Quote line color
   cfgObj.DCTColors.QuoteLineColor = "nc";
   // DCT colors for the border stuff
   cfgObj.DCTColors.TopBorderColor1 = "nr";
   cfgObj.DCTColors.TopBorderColor2 = "nrh";
   cfgObj.DCTColors.EditAreaBorderColor1 = "ng";
   cfgObj.DCTColors.EditAreaBorderColor2 = "ngh";
   cfgObj.DCTColors.EditModeBrackets = "nkh";
   cfgObj.DCTColors.EditMode = "nw";
   // DCT colors for the top informational area
   cfgObj.DCTColors.TopLabelColor = "nbh";
   cfgObj.DCTColors.TopLabelColonColor = "nb";
   cfgObj.DCTColors.TopFromColor = "nch";
   cfgObj.DCTColors.TopFromFillColor = "nc";
   cfgObj.DCTColors.TopToColor = "nch";
   cfgObj.DCTColors.TopToFillColor = "nc";
   cfgObj.DCTColors.TopSubjColor = "nwh";
   cfgObj.DCTColors.TopSubjFillColor = "nw";
   cfgObj.DCTColors.TopAreaColor = "ngh";
   cfgObj.DCTColors.TopAreaFillColor = "ng";
   cfgObj.DCTColors.TopTimeColor = "nyh";
   cfgObj.DCTColors.TopTimeFillColor = "nr";
   cfgObj.DCTColors.TopTimeLeftColor = "nyh";
   cfgObj.DCTColors.TopTimeLeftFillColor = "nr";
   cfgObj.DCTColors.TopInfoBracketColor = "nm";
   // DCT colors for the quote window
   cfgObj.DCTColors.QuoteWinText = "n7k";
   cfgObj.DCTColors.QuoteLineHighlightColor = "nw";
   cfgObj.DCTColors.QuoteWinBorderTextColor = "n7r";
   cfgObj.DCTColors.QuoteWinBorderColor = "nk7";
   // DCT colors for the quote window
   cfgObj.DCTColors.QuoteWinText = "n7b";
   cfgObj.DCTColors.QuoteLineHighlightColor = "nw";
   cfgObj.DCTColors.QuoteWinBorderTextColor = "n7r";
   cfgObj.DCTColors.QuoteWinBorderColor = "nk7";
   // DCT colors for the bottom row help text
   cfgObj.DCTColors.BottomHelpBrackets = "nkh";
   cfgObj.DCTColors.BottomHelpKeys = "nrh";
   cfgObj.DCTColors.BottomHelpFill = "nr";
   cfgObj.DCTColors.BottomHelpKeyDesc = "nc";
   // DCT colors for text boxes
   cfgObj.DCTColors.TextBoxBorder = "nk7";
   cfgObj.DCTColors.TextBoxBorderText = "nr7";
   cfgObj.DCTColors.TextBoxInnerText = "nb7";
   cfgObj.DCTColors.YesNoBoxBrackets = "nk7";
   cfgObj.DCTColors.YesNoBoxYesNoText = "nwh7";
   // DCT colors for the menus
   cfgObj.DCTColors.SelectedMenuLabelBorders = "nw";
   cfgObj.DCTColors.SelectedMenuLabelText = "nk7";
   cfgObj.DCTColors.UnselectedMenuLabelText = "nwh";
   cfgObj.DCTColors.MenuBorders = "nk7";
   cfgObj.DCTColors.MenuSelectedItems = "nw";
   cfgObj.DCTColors.MenuUnselectedItems = "nk7";
   cfgObj.DCTColors.MenuHotkeys = "nwh7";

   // Open the SlyEdit configuration file
   var slyEdCfgFileName = genFullPathCfgFilename("SlyEdit.cfg", gStartupPath);
   var cfgFile = new File(slyEdCfgFileName);
   if (cfgFile.open("r"))
   {
      var settingsMode = "behavior";
      var fileLine = null;     // A line read from the file
      var equalsPos = 0;       // Position of a = in the line
      var commentPos = 0;      // Position of the start of a comment
      var setting = null;      // A setting name (string)
      var settingUpper = null; // Upper-case setting name
      var value = null;        // A value for a setting (string)
      var valueUpper = null;   // Upper-cased value
      while (!cfgFile.eof)
      {
         // Read the next line from the config file.
         fileLine = cfgFile.readln(2048);

         // fileLine should be a string, but I've seen some cases
         // where for some reason it isn't.  If it's not a string,
         // then continue onto the next line.
         if (typeof(fileLine) != "string")
            continue;

         // If the line starts with with a semicolon (the comment
         // character) or is blank, then skip it.
         if ((fileLine.substr(0, 1) == ";") || (fileLine.length == 0))
            continue;

         // If in the "behavior" section, then set the behavior-related variables.
         if (fileLine.toUpperCase() == "[BEHAVIOR]")
         {
            settingsMode = "behavior";
            continue;
         }
         else if (fileLine.toUpperCase() == "[ICE_COLORS]")
         {
            settingsMode = "ICEColors";
            continue;
         }
         else if (fileLine.toUpperCase() == "[DCT_COLORS]")
         {
            settingsMode = "DCTColors";
            continue;
         }

         // If the line has a semicolon anywhere in it, then remove
         // everything from the semicolon onward.
         commentPos = fileLine.indexOf(";");
         if (commentPos > -1)
            fileLine = fileLine.substr(0, commentPos);

         // Look for an equals sign, and if found, separate the line
         // into the setting name (before the =) and the value (after the
         // equals sign).
         equalsPos = fileLine.indexOf("=");
         if (equalsPos > 0)
         {
            // Read the setting & value, and trim leading & trailing spaces.
            setting = trimSpaces(fileLine.substr(0, equalsPos), true, false, true);
            settingUpper = setting.toUpperCase();
            value = trimSpaces(fileLine.substr(equalsPos+1), true, false, true);
            valueUpper = value.toUpperCase();

            if (settingsMode == "behavior")
            {
               if (settingUpper == "DISPLAYENDINFOSCREEN")
                  cfgObj.displayEndInfoScreen = (valueUpper == "TRUE");
               else if (settingUpper == "USERINPUTTIMEOUT")
                  cfgObj.userInputTimeout = (valueUpper == "TRUE");
               else if (settingUpper == "INPUTTIMEOUTMS")
                  cfgObj.inputTimeoutMS = +value;
               else if (settingUpper == "REWRAPQUOTELINES")
                  cfgObj.reWrapQuoteLines = (valueUpper == "TRUE");
               else if (settingUpper == "ALLOWCOLORSELECTION")
                  cfgObj.allowColorSelection = (valueUpper == "TRUE");
               else if (settingUpper == "USEQUOTELINEINITIALS")
                  cfgObj.useQuoteLineInitials = (valueUpper == "TRUE");
               else if (settingUpper == "INDENTQUOTELINESWITHINITIALS")
                  cfgObj.indentQuoteLinesWithInitials = (valueUpper == "TRUE");
               else if (settingUpper == "ADD3RDPARTYSTARTUPSCRIPT")
                  cfgObj.thirdPartyLoadOnStart.push(value);
               else if (settingUpper == "ADD3RDPARTYEXITSCRIPT")
                  cfgObj.thirdPartyLoadOnExit.push(value);
               else if (settingUpper == "ADDJSONSTART")
                  cfgObj.runJSOnStart.push(value);
               else if (settingUpper == "ADDJSONEXIT")
                  cfgObj.runJSOnExit.push(value);
               else if (settingUpper == "ALLOWCROSSPOSTING")
                  cfgObj.allowCrossPosting = (valueUpper == "TRUE");
               else if (settingUpper == "ENABLETEXTREPLACEMENTS")
               {
                  // The enableTxtReplacements setting in the config file can
                  // be regex, true, or false:
                  //  - regex: Text replacement enabled using regular expressions
                  //  - true: Text replacement enabled using exact match
                  //  - false: Text replacement disabled
                  cfgObj.textReplacementsUseRegex = (valueUpper == "REGEX");
                  if (cfgObj.textReplacementsUseRegex)
                     cfgObj.enableTextReplacements = true;
                  else
                     cfgObj.enableTextReplacements = (valueUpper == "TRUE");
               }
            }
            else if (settingsMode == "ICEColors")
            {
               if (settingUpper == "THEMEFILENAME")
                  cfgObj.iceColors.ThemeFilename = genFullPathCfgFilename(value, gStartupPath);
            }
            else if (settingsMode == "DCTColors")
            {
               if (settingUpper == "THEMEFILENAME")
                  cfgObj.DCTColors.ThemeFilename = genFullPathCfgFilename(value, gStartupPath);
            }
         }
      }

      cfgFile.close();

      // Validate the settings
      if (cfgObj.inputTimeoutMS < 1000)
         cfgObj.inputTimeoutMS = 300000;
   }

   return cfgObj;
}

// This function reads a configuration file containing
// setting=value pairs and returns the settings in
// an Object.
//
// Parameters:
//  pFilename: The name of the configuration file.
//  pLineReadLen: The maximum number of characters to read from each
//                line.  This is optional; if not specified, then up
//                to 512 characters will be read from each line.
//
// Return value: An Object containing the value=setting pairs.  If the
//               file can't be opened or no settings can be read, then
//               this function will return null.
function readValueSettingConfigFile(pFilename, pLineReadLen)
{
   var retObj = null;

   var cfgFile = new File(pFilename);
   if (cfgFile.open("r"))
   {
      // Set the number of characters to read per line.
      var numCharsPerLine = 512;
      if (pLineReadLen != null)
         numCharsPerLine = pLineReadLen;

      var fileLine = null;     // A line read from the file
      var equalsPos = 0;       // Position of a = in the line
      var commentPos = 0;      // Position of the start of a comment
      var setting = null;      // A setting name (string)
      var settingUpper = null; // Upper-case setting name
      var value = null;        // A value for a setting (string)
      var valueUpper = null;   // Upper-cased value
      while (!cfgFile.eof)
      {
         // Read the next line from the config file.
         fileLine = cfgFile.readln(numCharsPerLine);

         // fileLine should be a string, but I've seen some cases
         // where it isn't, so check its type.
         if (typeof(fileLine) != "string")
            continue;

         // If the line starts with with a semicolon (the comment
         // character) or is blank, then skip it.
         if ((fileLine.substr(0, 1) == ";") || (fileLine.length == 0))
            continue;

         // If the line has a semicolon anywhere in it, then remove
         // everything from the semicolon onward.
         commentPos = fileLine.indexOf(";");
         if (commentPos > -1)
            fileLine = fileLine.substr(0, commentPos);

         // Look for an equals sign, and if found, separate the line
         // into the setting name (before the =) and the value (after the
         // equals sign).
         equalsPos = fileLine.indexOf("=");
         if (equalsPos > 0)
         {
            // If retObj hasn't been created yet, then create it.
            if (retObj == null)
               retObj = new Object();

            // Read the setting & value, and trim leading & trailing spaces.  Then
            // set the value in retObj.
            setting = trimSpaces(fileLine.substr(0, equalsPos), true, false, true);
            value = trimSpaces(fileLine.substr(equalsPos+1), true, false, true);
            retObj[setting] = value;
         }
      }

      cfgFile.close();
   }

   return retObj;
}

// Splits a string up by a maximum length, preserving whole words.
//
// Parameters:
//  pStr: The string to split
//  pMaxLen: The maximum length for the strings (strings longer than this
//           will be split)
//
// Return value: An array of strings resulting from the string split
function splitStrStable(pStr, pMaxLen)
{
   var strings = new Array();

   // Error checking
   if (typeof(pStr) != "string")
   {
      console.print("1 - pStr not a string!\r\n");
      return strings;
   }

   // If the string's length is less than or equal to pMaxLen, then
   // just insert it into the strings array.  Otherwise, we'll
   // need to split it.
   if (pStr.length <= pMaxLen)
      strings.push(pStr);
   else
   {
      // Make a copy of pStr so that we don't modify it.
      var theStr = pStr;

      var tempStr = "";
      var splitIndex = 0; // Index of a space in a string
      while (theStr.length > pMaxLen)
      {
         // If there isn't a space at the pMaxLen location in theStr,
         // then assume there's a word there and look for a space
         // before it.
         splitIndex = pMaxLen;
         if (theStr.charAt(splitIndex) != " ")
         {
            splitIndex = theStr.lastIndexOf(" ", splitIndex);
            // If a space was not found, then we should split at
            // pMaxLen.
            if (splitIndex == -1)
               splitIndex = pMaxLen;
         }

         // Extract the first part of theStr up to splitIndex into
         // tempStr, and then remove that part from theStr.
         tempStr = theStr.substr(0, splitIndex);
         theStr = theStr.substr(splitIndex+1);

         // If tempStr is not blank, then insert it into the strings
         // array.
         if (tempStr.length > 0)
            strings.push(tempStr);
      }
      // Edge case: If theStr is not blank, then insert it into the
      // strings array.
      if (theStr.length > 0)
         strings.push(theStr);
   }

   return strings;
}

// Inserts a string inside another string.
//
// Parameters:
//  pStr: The string inside which to insert the other string
//  pIndex: The index of pStr at which to insert the other string
//  pStr2: The string to insert into the first string
//
// Return value: The spliced string
function spliceIntoStr(pStr, pIndex, pStr2)
{
   // Error checking
   var typeofPStr = typeof(pStr);
   var typeofPStr2 = typeof(pStr2);
   if ((typeofPStr != "string") && (typeofPStr2 != "string"))
      return "";
   else if ((typeofPStr == "string") && (typeofPStr2 != "string"))
      return pStr;
   else if ((typeofPStr != "string") && (typeofPStr2 == "string"))
      return pStr2;
   // If pIndex is beyond the last index of pStr, then just return the
   // two strings concatenated.
   if (pIndex >= pStr.length)
      return (pStr + pStr2);
   // If pIndex is below 0, then just return pStr2 + pStr.
   else if (pIndex < 0)
      return (pStr2 + pStr);

   return (pStr.substr(0, pIndex) + pStr2 + pStr.substr(pIndex));
}

// Fixes the text lines in the gEditLines array so that they all
// have a maximum width to fit within the edit area.
//
// Parameters:
//  pTextLineArray: An array of TextLine objects to adjust
//  pStartIndex: The index of the line in the array to start at.
//  pEndIndex: One past the last index of the line in the array to end at.
//  pEditWidth: The width of the edit area (AKA the maximum line length + 1)
//
// Return value: Boolean - Whether or not any text was changed.
function reAdjustTextLines(pTextLineArray, pStartIndex, pEndIndex, pEditWidth)
{
   // Returns without doing anything if any of the parameters are not
   // what they should be. (Note: Not checking pTextLineArray for now..)
   if (typeof(pStartIndex) != "number")
      return false;
   if (typeof(pEndIndex) != "number")
      return false;
   if (typeof(pEditWidth) != "number")
      return false;
   // Range checking
   if ((pStartIndex < 0) || (pStartIndex >= pTextLineArray.length))
      return false;
   if ((pEndIndex <= pStartIndex) || (pEndIndex < 0))
      return false;
   if (pEndIndex > pTextLineArray.length)
      pEndIndex = pTextLineArray.length;
   if (pEditWidth <= 5)
      return false;

   var textChanged = false; // We'll return this upon function exit.

   var nextLineIndex = 0;
   var charsToRemove = 0;
   var splitIndex = 0;
   var spaceFound = false;      // Whether or not a space was found in a text line
   var splitIndexOriginal = 0;
   var tempText = null;
   var appendedNewLine = false; // If we appended another line
   for (var i = pStartIndex; i < pEndIndex; ++i)
   {
      // As an extra precaution, check to make sure this array element is defined.
      if (pTextLineArray[i] == undefined)
         continue;

      nextLineIndex = i + 1;
      // If the line's text is longer or equal to the edit width, then if
      // possible, move the last word to the beginning of the next line.
      if (pTextLineArray[i].text.length >= pEditWidth)
      {
         charsToRemove = pTextLineArray[i].text.length - pEditWidth + 1;
         splitIndex = pTextLineArray[i].text.length - charsToRemove;
         splitIndexOriginal = splitIndex;
         // If the character in the text line at splitIndex is not a space,
         // then look for a space before splitIndex.
         spaceFound = (pTextLineArray[i].text.charAt(splitIndex) == " ");
         if (!spaceFound)
         {
            splitIndex = pTextLineArray[i].text.lastIndexOf(" ", splitIndex-1);
            spaceFound = (splitIndex > -1);
            if (!spaceFound)
               splitIndex = splitIndexOriginal;
         }
         tempText = pTextLineArray[i].text.substr(spaceFound ? splitIndex+1 : splitIndex);
         pTextLineArray[i].text = pTextLineArray[i].text.substr(0, splitIndex);
         textChanged = true;
         // If we're on the last line, or if the current line has a hard
         // newline or is a quote line, then append a new line below.
         appendedNewLine = false;
         if ((nextLineIndex == pTextLineArray.length) || pTextLineArray[i].hardNewlineEnd ||
             isQuoteLine(pTextLineArray, i))
         {
            pTextLineArray.splice(nextLineIndex, 0, new TextLine());
            pTextLineArray[nextLineIndex].hardNewlineEnd = pTextLineArray[i].hardNewlineEnd;
            pTextLineArray[i].hardNewlineEnd = false;
            pTextLineArray[nextLineIndex].isQuoteLine = pTextLineArray[i].isQuoteLine;
            appendedNewLine = true;
         }

         // Move the text around and adjust the line properties.
         if (appendedNewLine)
            pTextLineArray[nextLineIndex].text = tempText;
         else
         {
            // If we're in insert mode, then insert the text at the beginning of
            // the next line.  Otherwise, overwrite the text in the next line.
            if (inInsertMode())
               pTextLineArray[nextLineIndex].text = tempText + " " + pTextLineArray[nextLineIndex].text;
            else
            {
               // We're in overwrite mode, so overwite the first part of the next
               // line with tempText.
               if (pTextLineArray[nextLineIndex].text.length < tempText.length)
                  pTextLineArray[nextLineIndex].text = tempText;
               else
               {
                  pTextLineArray[nextLineIndex].text = tempText
                                           + pTextLineArray[nextLineIndex].text.substr(tempText.length);
               }
            }
         }
      }
      else
      {
         // pTextLineArray[i].text.length is < pEditWidth, so try to bring up text
         // from the next line.

         // Only do it if the line doesn't have a hard newline and it's not a
         // quote line and there is a next line.
         if (!pTextLineArray[i].hardNewlineEnd && !isQuoteLine(pTextLineArray, i) &&
             (i < pTextLineArray.length-1))
         {
            if (pTextLineArray[nextLineIndex].text.length > 0)
            {
               splitIndex = pEditWidth - pTextLineArray[i].text.length - 2;
               // If splitIndex is negative, that means the entire next line
               // can fit on the current line.
               if ((splitIndex < 0) || (splitIndex > pTextLineArray[nextLineIndex].text.length))
                  splitIndex = pTextLineArray[nextLineIndex].text.length;
               else
               {
                  // If the character in the next line at splitIndex is not a
                  // space, then look for a space before it.
                  if (pTextLineArray[nextLineIndex].text.charAt(splitIndex) != " ")
                     splitIndex = pTextLineArray[nextLineIndex].text.lastIndexOf(" ", splitIndex);
                  // If no space was found, then skip to the next line (we don't
                  // want to break up words from the next line).
                  if (splitIndex == -1)
                     continue;
               }

               // Get the text to bring up to the current line.
               // If the current line does not end with a space and the next line
               // does not start with a space, then add a space between this line
               // and the next line's text.  This is done to avoid joining words
               // accidentally.
               tempText = "";
               if ((pTextLineArray[i].text.charAt(pTextLineArray[i].text.length-1) != " ") &&
                   (pTextLineArray[nextLineIndex].text.substr(0, 1) != " "))
               {
                  tempText = " ";
               }
               tempText += pTextLineArray[nextLineIndex].text.substr(0, splitIndex);
               // Move the text from the next line to the current line, if the current
               // line has room for it.
               if (pTextLineArray[i].text.length + tempText.length < pEditWidth)
               {
                  pTextLineArray[i].text += tempText;
                  pTextLineArray[nextLineIndex].text = pTextLineArray[nextLineIndex].text.substr(splitIndex+1);
                  textChanged = true;

                  // If the next line is now blank, then remove it.
                  if (pTextLineArray[nextLineIndex].text.length == 0)
                  {
                     // The current line should take on the next line's
                     // hardnewlineEnd property before removing the next line.
                     pTextLineArray[i].hardNewlineEnd = pTextLineArray[nextLineIndex].hardNewlineEnd;
                     pTextLineArray.splice(nextLineIndex, 1);
                  }
               }
            }
            else
            {
               // The next line's text string is blank.  If its hardNewlineEnd
               // property is false, then remove the line.
               if (!pTextLineArray[nextLineIndex].hardNewlineEnd)
               {
                  pTextLineArray.splice(nextLineIndex, 1);
                  textChanged = true;
               }
            }
         }
      }
   }

   return textChanged;
}

// Returns indexes of the first unquoted text line and the next
// quoted text line in an array of text lines.
//
// Parameters:
//  pTextLineArray: An array of TextLine objects
//  pStartIndex: The index of where to start looking in the array
//  pQuotePrefix: The quote line prefix (string)
//
// Return value: An object containing the following properties:
//               noQuoteLineIndex: The index of the next non-quoted line.
//                                 Will be -1 if none are found.
//               nextQuoteLineIndex: The index of the next quoted line.
//                                   Will be -1 if none are found.
function quotedLineIndexes(pTextLineArray, pStartIndex, pQuotePrefix)
{
   var retObj = new Object();
   retObj.noQuoteLineIndex = -1;
   retObj.nextQuoteLineIndex = -1;

   if (pTextLineArray.length == 0)
      return retObj;
   if (typeof(pStartIndex) != "number")
      return retObj;
   if (pStartIndex >= pTextLineArray.length)
      return retObj;

   var startIndex = (pStartIndex > -1 ? pStartIndex : 0);

   // Look for the first non-quoted line in the array.
   retObj.noQuoteLineIndex = startIndex;
   for (; retObj.noQuoteLineIndex < pTextLineArray.length; ++retObj.noQuoteLineIndex)
   {
      if (pTextLineArray[retObj.noQuoteLineIndex].text.indexOf(pQuotePrefix) == -1)
         break;
   }
   // If the index is pTextLineArray.length, then what we're looking for wasn't
   // found, so set the index to -1.
   if (retObj.noQuoteLineIndex == pTextLineArray.length)
      retObj.noQuoteLineIndex = -1;

   // Look for the next quoted line in the array.
   // If we found a non-quoted line, then use that index; otherwise,
   // start at the first line.
   if (retObj.noQuoteLineIndex > -1)
      retObj.nextQuoteLineIndex = retObj.noQuoteLineIndex;
   else
      retObj.nextQuoteLineIndex = 0;
   for (; retObj.nextQuoteLineIndex < pTextLineArray.length; ++retObj.nextQuoteLineIndex)
   {
      if (pTextLineArray[retObj.nextQuoteLineIndex].text.indexOf(pQuotePrefix) == 0)
         break;
   }
   // If the index is pTextLineArray.length, then what we're looking for wasn't
   // found, so set the index to -1.
   if (retObj.nextQuoteLineIndex == pTextLineArray.length)
      retObj.nextQuoteLineIndex = -1;

   return retObj;
}

// Returns whether a line in an array of TextLine objects is a quote line.
// This is true if the line's isQuoteLine property is true or the line's text
// starts with > (preceded by any # of spaces).
//
// Parameters:
//  pLineArray: An array of TextLine objects
//  pLineIndex: The index of the line in gEditLines
function isQuoteLine(pLineArray, pLineIndex)
{
   if (typeof(pLineArray) == "undefined")
      return false;
   if (typeof(pLineIndex) != "number")
      return false;

   var lineIsQuoteLine = false;
   if (typeof(pLineArray[pLineIndex]) != "undefined")
   {
      /*
      lineIsQuoteLine = ((pLineArray[pLineIndex].isQuoteLine) ||
                     (/^ *>/.test(pLineArray[pLineIndex].text)));
      */
      lineIsQuoteLine = (pLineArray[pLineIndex].isQuoteLine);
   }
   return lineIsQuoteLine;
}

// Replaces an attribute in a text attribute string.
//
// Parameters:
//  pAttrType: Numeric:
//             FORE_ATTR: Foreground attribute
//             BKG_ATTR: Background attribute
//             3: Special attribute
//  pAttrs: The attribute string to change
//  pNewAttr: The new attribute to put into the attribute string (without the
//            control character)
function toggleAttr(pAttrType, pAttrs, pNewAttr)
{
   // Removes an attribute from an attribute string, if it
   // exists.  Returns the new attribute string.
   function removeAttrIfExists(pAttrs, pNewAttr)
   {
      var index = pAttrs.search(pNewAttr);
      if (index > -1)
         pAttrs = pAttrs.replace(pNewAttr, "");
      return pAttrs;
   }

   // Convert pAttrs and pNewAttr to all uppercase for ease of searching
   pAttrs = pAttrs.toUpperCase();
   pNewAttr = pNewAttr.toUpperCase();

   // If pAttrs starts with the normal attribute, then
   // remove it (we'll put it back on later).
   var normalAtStart = false;
   if (pAttrs.search(/^N/) == 0)
   {
      normalAtStart = true;
      pAttrs = pAttrs.substr(2);
   }

   // Prepend the attribute control character to the new attribute
   var newAttr = "" + pNewAttr;

   // Set a regex for searching & replacing
   var regex = "";
   switch (pAttrType)
   {
      case FORE_ATTR: // Foreground attribute
         regex = /K|R|G|Y|B|M|C|W/g;
         break;
      case BKG_ATTR: // Background attribute
         regex = /0|1|2|3|4|5|6|7/g;
         break;
      case SPECIAL_ATTR: // Special attribute
         //regex = /H|I|N/g;
         index = pAttrs.search(newAttr);
         if (index > -1)
            pAttrs = pAttrs.replace(newAttr, "");
         else
            pAttrs += newAttr;
         break;
      default:
         break;
   }

   // If regex is not blank, then search & replace on it in
   // pAttrs.
   if (regex != "")
   {
      pAttrs = removeAttrIfExists(pAttrs, newAttr);
      // If the regex is found, then replace it.  Otherwise,
      // add pNewAttr to the attribute string.
      if (pAttrs.search(regex) > -1)
         pAttrs = pAttrs.replace(regex, "" + pNewAttr);
      else
         pAttrs += "" + pNewAttr;
   }

   // If pAttrs started with the normal attribute, then
   // put it back on.
   if (normalAtStart)
      pAttrs = "N" + pAttrs;

   return pAttrs;
}

// This function wraps an array of strings based on a line width.
//
// Parameters:
//  pLineArr: An array of strings
//  pStartLineIndex: The index of the text line in the array to start at
//  pStopIndex: The index of where to stop in the array.  This is one past
//              the last line in the array.  For example, to end at the
//              last line in the array, use the array's .length property
//              for this parameter.
//  pLineWidth: The maximum width of each line
//
// Return value: The number of strings in lineArr
function wrapTextLines(pLineArr, pStartLineIndex, pStopIndex, pLineWidth)
{
  // Validate parameters
  if (pLineArr == null)
    return 0;
  if ((pStartLineIndex == null) || (typeof(pStartLineIndex) != "number") || (pStartLineIndex < 0))
    pStartLineIndex = 0;
  if (pStartLineIndex >= pLineArr.length)
    return pLineArr.length;
  if ((typeof(pStopIndex) != "number") || (pStopIndex == null) || (pStopIndex > pLineArr.length))
    pStopIndex = pLineArr.length;

  // Now for the actual code:
  var trimLen = 0;   // The number of characters to trim from the end of a string
  var trimIndex = 0; // The index of where to start trimming
  for (var i = pStartLineIndex; i < pStopIndex; ++i)
  {
    // If the object in pLineArr is not a string for some reason, then skip it.
    if (typeof(pLineArr[i]) != "string")
      continue;

    if (pLineArr[i].length > pLineWidth)
    {
      trimLen = pLineArr[i].length - pLineWidth;
      trimIndex = pLineArr[i].lastIndexOf(" ", pLineArr[i].length - trimLen);
      if (trimIndex == -1)
        trimIndex = pLineArr[i].length - trimLen;
      // Trim the text, and remove leading spaces from it too.
      trimmedText = pLineArr[i].substr(trimIndex).replace(/^ +/, "");
      pLineArr[i] = pLineArr[i].substr(0, trimIndex);
      if (i < pLineArr.length - 1)
      {
        // If the next line is blank, then append another blank
        // line there to preserve the message's formatting.
        if (pLineArr[i+1].length == 0)
          pLineArr.splice(i+1, 0, "");
        else
        {
          // Since the next line is not blank, then append a space
          // to the end of the trimmed text if it doesn't have one.
          if (trimmedText.charAt(trimmedText.length-1) != " ")
            trimmedText += " "
        }
        // Prepend the trimmed text to the next line.
        pLineArr[i+1] = trimmedText + pLineArr[i+1];
      }
      else
        pLineArr.push(trimmedText);
    }
  }
  return pLineArr.length;
}

// Returns an object containing default quote string information.
//
// Return value: An object containing the following properties:
//               startIndex: The index of the first non-quote character in the string.
//                           Defaults to -1.
//               quoteLevel: The number of > characters at the start of the string
//               begOfLine: Normally, the quote text at the beginng of the line.
//                          This defaults to a blank string.
function getDefaultQuoteStrObj()
{
  var retObj = new Object();
  retObj.startIndex = -1;
  retObj.quoteLevel = 0;
  retObj.begOfLine = ""; // Will store the beginning of the line, before the >
  return retObj;
}

// Returns the index of a string for the first non-quote character.
//
// Parameters:
//  pStr: A string to check
//  pUseAuthorInitials: Whether or not SlyEdit is configured to prefix
//                      quote lines with author's initials
//
// Return value: An object containing the following properties:
//               startIndex: The index of the first non-quote character in the string.
//                           If pStr is an invalid string, or if a non-quote character
//                           is not found, this will be -1.
//               quoteLevel: The number of > characters at the start of the string
//               begOfLine: The quote text at the beginng of the line
function firstNonQuoteTxtIndex(pStr, pUseAuthorInitials, pIndentQuoteLinesWithInitials)
{
  // Create the return object with initial values.
  var retObj = getDefaultQuoteStrObj();  

  // If pStr is not a valid positive-length string, then just return.
  if ((pStr == null) || (typeof(pStr) != "string") || (pStr.length == 0))
    return retObj;

  // Look for quote lines that begin with 1 or 2 initials followed by a > (i.e.,
  // "EO>" or "E>" at the start of the line.  If found, set an index to look for
  // & count the > characters from the >.
  var searchStartIndex = 0;
  // Regex notes:
  //  \w: Matches any alphanumeric character (word characters) including underscore (short for [a-zA-Z0-9_])
  //  ?: Supposed to match 0 or 1 occurance, but seems to match 1 or 2
  // First, look for spaces then 1 or 2 initials followed by a non-space followed
  // by a >.  If not found, then look for ">>".  If that isn't found, then look
  // for just 2 characters followed by a >.
  var lineStartsWithQuoteText = /^ *\w?[^ ]>/.test(pStr);
  if (pUseAuthorInitials)
  {
    if (!lineStartsWithQuoteText)
      lineStartsWithQuoteText = (pStr.lastIndexOf(">>") > -1);
    if (!lineStartsWithQuoteText)
      lineStartsWithQuoteText = /\w{2}>/.test(pStr);
  }
  if (lineStartsWithQuoteText)
  {
    if (pUseAuthorInitials)
    {
      // First, look for ">> " starting from the beginning of the line
      // (this would be a line that has been quoted at least twice).
      // If found, then increment searchStartIndex by 2 to get past the
      // >> characters.  Otherwise, look for the last instance of 2
      // letters, numbers, or underscores (a user's handle could have
      // these characters) followed by >.  (It's possible that someone's
      // username has a number in it.)
      searchStartIndex = pStr.lastIndexOf(">> ");
      if (searchStartIndex > -1)
        searchStartIndex += 2;
      else
      {
        // If pStr is at least 3 characters long, then starting with the
        // last 3 characters in pStr, look for an instance of 2 letters
        // or numbers or underscores followed by a >.  Keep moving back
        // 1 character at a time until found or until the beginning of
        // the string is reached.
        if (pStr.length >= 3)
        {
          // Regex notes:
          //  \w: Matches any alphanumeric character (word characters) including underscore (short for [a-zA-Z0-9_])
          var substrStartIndex = pStr.length - 3;
          for (; (substrStartIndex >= 0) && (searchStartIndex < 0); --substrStartIndex)
            searchStartIndex = pStr.substr(substrStartIndex, 3).search(/\w{2}>/);
          ++substrStartIndex; // To fix off-by-one
          if (searchStartIndex > -1)
            searchStartIndex += substrStartIndex + 3; // To get past the "..>"
                                                      // Note: I originally had + 4 here..
          if (searchStartIndex < 0)
          {
            searchStartIndex = pStr.indexOf(">");
            if (searchStartIndex < 0)
              searchStartIndex = 0;
          }
        }
        else
        {
          searchStartIndex = pStr.indexOf(">");
          if (searchStartIndex < 0)
            searchStartIndex = 0;
        }
      }
    }
    else
    {
      // SlyEdit is not prefixing quote lines with author's initials.
      searchStartIndex = pStr.indexOf(">");
      if (searchStartIndex < 0)
        searchStartIndex = 0;
    }
  }

  // Find the quote level and the beginning of the line.
  // Look for the first non-quote text and quote level in the string.
  var strChar = "";
  var j = 0;
  var GTIndex = -1; // Index of a > character in the string
  for (var i = searchStartIndex; i < pStr.length; ++i)
  {
    strChar = pStr.charAt(i);
    if ((strChar != " ") && (strChar != ">"))
    {
      // We've found the first non-quote character.
      retObj.startIndex = i;
      // Count the number of times the > character appears at the start of
      // the line, and set quoteLevel to that.
      if (i >= 0)
      {
        for (j = 0; j < i; ++j)
        {
          if (pStr.charAt(j) == ">")
            ++retObj.quoteLevel;
        }
      }
      // Store the beginning of the line in retObj.begOfLine.  And if
      // SlyEdit is configured to indent quote lines with author initials,
      // and if the beginning of the line doesn't begin with a space,
      // then add a space to the beginning of it.
      retObj.begOfLine = pStr.substr(0, retObj.startIndex);
      if (pUseAuthorInitials && pIndentQuoteLinesWithInitials && (retObj.begOfLine.length > 0) && (retObj.begOfLine.charAt(0) != " "))
        retObj.begOfLine = " " + retObj.begOfLine;
      break;
    }
  }

  // If we haven't found non-quote text but the line starts with quote text,
  // then set the starting index & quote level in retObj.
  //displayDebugText(1, 2, "Search start index: " + searchStartIndex, console.getxy(), true, true);
  if (lineStartsWithQuoteText && ((retObj.startIndex == -1) || (retObj.quoteLevel == 0)))
  {
    retObj.startIndex = pStr.indexOf(">") + 1;
    retObj.quoteLevel = 1;
  }

  return retObj;
}

// Performs text wrapping on the quote lines.
//
// Parameters:
//  pUseAuthorInitials: Whether or not to prefix quote lines with the last author's
//                      initials
// pIndentQuoteLinesWithInitials: If prefixing the quote lines with the
//                                last author's initials, this parameter specifies
//                                whether or not to also prefix the quote lines with
//                                a space.
function wrapQuoteLines(pUseAuthorInitials, pIndentQuoteLinesWithInitials)
{
  if (gQuoteLines.length == 0)
    return;

  var useAuthorInitials = true;
  var indentQuoteLinesWithInitials = false;
  if (typeof(pUseAuthorInitials) != "undefined")
    useAuthorInitials = pUseAuthorInitials;
  if (typeof(pIndentQuoteLinesWithInitials) != "undefined")
    indentQuoteLinesWithInitials = pIndentQuoteLinesWithInitials;

  // This function checks if a string has only > characters separated by
  // whitespace and returns a version where the > characters are only separated
  // by one space each.  If the line starts with " >", the leading space will
  // be removed.
  function normalizeGTChars(pStr)
  {
    if (/^\s*>\s*$/.test(pStr))
      pStr = ">";
    else
    {
      pStr = pStr.replace(/>\s*>/g, "> >")
                 .replace(/^\s>/, ">")
                 .replace(/^\s*$/, "");
    }
    return pStr;
  }

  // Note: gQuotePrefix is declared in SlyEdit.js.
  // Make another copy of it without its leading space for searching the
  // quote lines later.
  var quotePrefixWithoutLeadingSpace = gQuotePrefix.replace(/^ /, "");

  // Create an array for line information objects, and append the
  // line info for all quote lines into it.  Also, store the first
  // line's quote level in the lastQuoteLevel variable.
  var lineInfos = new Array();
  for (var quoteLineIndex = 0; quoteLineIndex < gQuoteLines.length; ++quoteLineIndex)
    lineInfos.push(firstNonQuoteTxtIndex(gQuoteLines[quoteLineIndex], pUseAuthorInitials, pIndentQuoteLinesWithInitials));
  var lastQuoteLevel = lineInfos[0].quoteLevel;

  // Loop through the array starting at the 2nd line and wrap the lines
  var startArrIndex = 0;
  var endArrIndex = 0;
  var quotePrefix = "";
  var quoteLevel = 0;
  var quoteLineInfoObj = null;
  var i = 0; // Index variable
  var maxBegOfLineLen = 0; // For storing the length of the longest beginning of line that was removed
  for (var quoteLineIndex = 1; quoteLineIndex < gQuoteLines.length; ++quoteLineIndex)
  {
    quoteLineInfoObj = lineInfos[quoteLineIndex];
    if (quoteLineInfoObj.quoteLevel != lastQuoteLevel)
    {
      maxBegOfLineLen = 0;
      endArrIndex = quoteLineIndex;
      // Remove the quote strings from the lines we're about to wrap
      for (i = startArrIndex; i < endArrIndex; ++i)
      {
        // lineInfos[i] is checked for null to avoid the error "!JavaScript
        // TypeError: lineInfos[i] is undefined".  But I'm not sure why it
        // would be null..
        if (lineInfos[i] != null)
        {
          if (lineInfos[i].startIndex > -1)
            gQuoteLines[i] = gQuoteLines[i].substr(lineInfos[i].startIndex);
          else
            gQuoteLines[i] = normalizeGTChars(gQuoteLines[i]);
          // If the quote line now only consists of spaces after removing the quote
          // characters, then make it blank.
          if (/^ +$/.test(gQuoteLines[i]))
            gQuoteLines[i] = "";
          // Change multiple spaces to single spaces in the beginning-of-line
          // string.  Also, if not prefixing quote lines w/ initials with a
          // space, then also trim leading spaces.
          if (useAuthorInitials && indentQuoteLinesWithInitials)
            lineInfos[i].begOfLine = trimSpaces(lineInfos[i].begOfLine, false, true, false);
          else
            lineInfos[i].begOfLine = trimSpaces(lineInfos[i].begOfLine, true, true, false);

          // See if we need to update maxBegOfLineLen, and if so, do it.
          if (lineInfos[i].begOfLine.length > maxBegOfLineLen)
            maxBegOfLineLen = lineInfos[i].begOfLine.length;
        }
      }
      // If maxBegOfLineLen is positive, then add 1 more to it because
      // we'll be adding a > character to the quote lines to signify one
      // more level of quoting.
      if (maxBegOfLineLen > 0)
        ++maxBegOfLineLen;
      // Add gQuotePrefix's length to maxBegOfLineLen to account for that
      // for wrapping the text. Note: In future versions, if we don't want
      // to add the previous author's initials to all lines, then we might
      // not automatically want to add this to every line.
      maxBegOfLineLen += gQuotePrefix.length;

      var numLinesBefore = gQuoteLines.length;

      // Wrap the text lines in the range we've seen
      // Note: 79 is assumed as the maximum line length because that seems to
      // be a commonly-accepted message width for BBSs.  So, we need to
      // subtract the maximum "beginning of line" length from 79 and use that
      // as the wrapping length.
      // If using author initials in the quote lines, use maxBegOfLineLen as
      // the basis of where to wrap.  Otherwise (for older style without
      // author initials), calculate the width based on the quote level and
      // number of " > " strings we'll insert.
      if (useAuthorInitials)
        wrapTextLines(gQuoteLines, startArrIndex, endArrIndex, 79 - maxBegOfLineLen);
      else
        wrapTextLines(gQuoteLines, startArrIndex, endArrIndex, 79 - (2*(lastQuoteLevel+1) + gQuotePrefix.length));
      // If quote lines were added as a result of wrapping, then
      // determine the number of lines added, and update endArrIndex
      // and quoteLineIndex accordingly.
      var numLinesAdded = 0; // Will store the number of lines added after wrapping
      if (gQuoteLines.length > numLinesBefore)
      {
        numLinesAdded = gQuoteLines.length - numLinesBefore;
        endArrIndex += numLinesAdded;
        //quoteLineIndex += (numLinesAdded-1); // - 1 because quoteLineIndex will be incremented by the for loop
        quoteLineIndex += numLinesAdded;

        // Splice in a quote line info object for each new line added
        // by the wrapping process.
        var insertEndIndex = endArrIndex + numLinesAdded - 1;
        for (var insertIndex = endArrIndex-1; insertIndex < insertEndIndex; ++insertIndex)
        {
          lineInfos.splice(insertIndex, 0, getDefaultQuoteStrObj());
          lineInfos[insertIndex].startIndex = lineInfos[startArrIndex].startIndex;
          lineInfos[insertIndex].quoteLevel = lineInfos[startArrIndex].quoteLevel;
          lineInfos[insertIndex].begOfLine = lineInfos[startArrIndex].begOfLine;
        }
      }
      // Put the beginnings of the wrapped lines back on them.
      if ((quoteLineIndex > 0) && (lastQuoteLevel > 0))
      {
        // If using the author's initials in the quote lines, then
        // do it the new way.  Otherwise, do it the old way where
        // we just insert "> " back in the beginning of the quote
        // lines.
        if (useAuthorInitials)
        {
          for (i = startArrIndex; i < endArrIndex; ++i)
          {
            if (lineInfos[i] != null)
            {
              // If the beginning of the line has a non-zero length,
              // then add a > at the end to signify that this line is
              // being quoted again.
              var begOfLineLen = lineInfos[i].begOfLine.length;
              if (begOfLineLen > 0)
              {
                if (lineInfos[i].begOfLine.charAt(begOfLineLen-1) == " ")
                  lineInfos[i].begOfLine = lineInfos[i].begOfLine.substr(0, begOfLineLen-1) + "> ";
                else
                  lineInfos[i].begOfLine += ">";
              }
              // Re-assemble the quote line
              gQuoteLines[i] = lineInfos[i].begOfLine + gQuoteLines[i];
            }
            else
            {
              // Old style: Put quote strings ("> ") back into the lines
              // we just wrapped.
              quotePrefix = "";
              for (i = 0; i < lastQuoteLevel; ++i)
                quotePrefix += "> ";
              gQuoteLines[i] = quotePrefix + gQuoteLines[i].replace(/^\s*>/, ">");
            }
          }
        }
        else
        {
          // Not using author initials in the quote lines.
          // Old style: Put quote strings ("> ") back into the lines
          // we just wrapped.
          quotePrefix = "";
          for (i = 0; i < lastQuoteLevel; ++i)
            quotePrefix += "> ";
          for (i = startArrIndex; i < endArrIndex; ++i)
            gQuoteLines[i] = quotePrefix + gQuoteLines[i].replace(/^\s*>/, ">");
        }
      }

      lastQuoteLevel = quoteLineInfoObj.quoteLevel;
      // We want to go onto the next block of quote lines to wrap, so
      // set startArrIndex to the next line where we want to start wrapping.
      //startArrIndex = quoteLineIndex + numLinesAdded;
      startArrIndex = quoteLineIndex;

      if (useAuthorInitials)
      {
        // For quoting only the last author's lines: Insert gQuotePrefix
        // to the front of the quote lines.  gQuotePrefix contains the
        // last message author's initials.
        if (quoteLineInfoObj.quoteLevel == 0)
        {
          if ((gQuoteLines[i].length > 0) && (gQuoteLines[i].indexOf(gQuotePrefix) != 0) && (gQuoteLines[i].indexOf(quotePrefixWithoutLeadingSpace) != 0))
            gQuoteLines[i] = gQuotePrefix + gQuoteLines[i];
        }
      }
    }
  }

  // Wrap the last block of lines: This is the block that contains
  // (some of) the last message's author's reply to the quoted lines
  // above it.
  // Then, go through the quote lines again, and for ones that start with " >",
  // remove the leading whitespace.  This is because the quote string is " > ",
  // so it would insert an extra space before the first > in the quote line.
  // Also, if using author initials, quote the last author's lines by inserting
  // gQuotePrefix to the front of the quote lines.  gQuotePrefix contains the
  // last message author's initials.
  if (useAuthorInitials)
  {
    wrapTextLines(gQuoteLines, startArrIndex, gQuoteLines.length, 79 - gQuotePrefix.length);
    // If there are now more quote lines than lineInfo objects, then determine the quote
    // level for the remaining quote lines.
    if (gQuoteLines.length > lineInfos.length)
    {
      var numLinesRemaining = gQuoteLines.length - lineInfos.length;
      for (var quoteLineIndex = gQuoteLines.length-numLinesRemaining; quoteLineIndex < gQuoteLines.length; ++quoteLineIndex)
        lineInfos.push(firstNonQuoteTxtIndex(gQuoteLines[quoteLineIndex], pUseAuthorInitials, pIndentQuoteLinesWithInitials));
    }
    // Wrap the quote lines
    for (i = 0; i < gQuoteLines.length; ++i)
    {
      // If not prefixing the quote lines with a space, then remove leading
      // whitespace from the quote line if it starts with a >.
      if (!indentQuoteLinesWithInitials)
        gQuoteLines[i] = gQuoteLines[i].replace(/^\s*>/, ">");
      // Quote the last author's lines with gQuotePrefix
      if ((lineInfos[i] != null) && (lineInfos[i].quoteLevel == 0))
      {
        if ((gQuoteLines[i].length > 0) && (gQuoteLines[i].indexOf(gQuotePrefix) != 0) && (gQuoteLines[i].indexOf(quotePrefixWithoutLeadingSpace) != 0))
          gQuoteLines[i] = gQuotePrefix + gQuoteLines[i];
      }
    }
  }
  else
  {
    wrapTextLines(gQuoteLines, startArrIndex, gQuoteLines.length, 79 - (2*(lastQuoteLevel+1) + gQuotePrefix.length));
    for (i = 0; i < gQuoteLines.length; ++i)
      gQuoteLines[i] = gQuoteLines[i].replace(/^\s*>/, ">");
  }
}

// Returns an object containing the following properties:
//  lastMsg: The last message in the sub-board (i.e., bbs.smb_last_msg)
//  totalNumMsgs: The total number of messages in the sub-board (i.e., bbs.smb_total_msgs)
//  curMsgNum: The number/index of the current message being read.  Starting
//             with Synchronet 3.16 on May 12, 2013, this is the absolute
//             message number (bbs.msg_number).  For Synchronet builds before
//             May 12, 2013, this is bbs.smb_curmsg.  Starting on May 12, 2013,
//             bbs.msg_number is preferred because it works properly in all
//             situations, whereas in earlier builds, bbs.msg_number was
//             always given to JavaScript scripts as 0.
//  msgNumIsOffset: Boolean - Whether or not the message number is an offset.
//                  If not, then it is the absolute message number (i.e.,
//                  bbs.msg_number).
//  subBoardCode: The current sub-board code (i.e., bbs.smb_sub_code)
//  grpIndex: The message group index for the sub-board
//
// This function First tries to read the values from the file
// DDML_SyncSMBInfo.txt in the node directory (written by the Digital
// Distortion Message Lister v1.31 and higher).  If that file can't be read,
// the values will default to the values of bbs.smb_last_msg,
// bbs.smb_total_msgs, and bbs.msg_number/bbs.smb_curmsg.
//
// Parameters:
//  pMsgAreaName: The name of the message area being posted to
function getCurMsgInfo(pMsgAreaName)
{
  var retObj = new Object();
  retObj.msgNumIsOffset = false;
  if (bbs.smb_sub_code.length > 0)
  {
    retObj.lastMsg = bbs.smb_last_msg;
    retObj.totalNumMsgs = bbs.smb_total_msgs;
    // If bbs.msg_number is valid (greater than 0), then use it.  Otherwise,
    // use the older behavior of using bbs.smb_curmsg (the offset) instead.
    // bbs.msg_number was correct in Synchronet 3.16 builds starting on
    // May 12, 2013.
    //retObj.curMsgNum = (bbs.msg_number > 0 ? bbs.msg_number : bbs.smb_curmsg);
    if (bbs.msg_number > 0)
      retObj.curMsgNum = bbs.msg_number;
    else
    {
      retObj.curMsgNum = bbs.smb_curmsg;
      retObj.msgNumIsOffset = true;
    }
    retObj.subBoardCode = bbs.smb_sub_code;
    retObj.grpIndex = msg_area.sub[bbs.smb_sub_code].grp_index;
  }
  else
  {
    retObj.lastMsg = -1;
    retObj.curMsgNum = -1;
    // If the user has a valid current sub-board code, then use it;
    // otherwise, find the first sub-board the user is able to post
    // in and use that.
    if (typeof(msg_area.sub[bbs.cursub_code]) != "undefined")
    {
      retObj.subBoardCode = bbs.cursub_code;
      retObj.grpIndex = msg_area.sub[bbs.cursub_code].grp_index;
    }
    else
    {
      var firstPostableSubInfo = getFirstPostableSubInfo();
      retObj.subBoardCode = firstPostableSubInfo.subCode;
      retObj.grpIndex = firstPostableSubInfo.grpIndex;
    }

    // If we got a valid sub-board code, then open that sub-board
    // and get the total number of messages from it.
    if (retObj.subBoardCode.length > 0)
    {
      var tmpMsgBaseObj = new MsgBase(retObj.subBoardCode);
      if (tmpMsgBaseObj.open())
      {
        retObj.totalNumMsgs = tmpMsgBaseObj.total_msgs;
        tmpMsgBaseObj.close();
      }
      else
        retObj.totalNumMsgs = 0;
    }
    else
       retObj.totalNumMsgs = 0;
  }
  // If pMsgAreaName is valid, then if it specifies a message area name that is
  // different from what's in retObj, then we probably want to use bbs.cursub_code
  // instead of bbs.smb_sub_code, etc.
  // Note: As of the May 8, 2013 build of Synchronet (3.16), the bbs.smb_sub*
  // properties reflect the current sub-board being posted to, always.
  // Digital Man committed a change in CVS for this on May 7, 2013.
  if ((typeof(pMsgAreaName) == "string") && (pMsgAreaName.length > 0))
  {
    if (msg_area.sub[retObj.subBoardCode].name.indexOf(pMsgAreaName) == -1)
    {
      retObj.lastMsg = -1;
      retObj.curMsgNum = -1;
      // If the user has a valid current sub-board code, then use it;
      // otherwise, find the first sub-board the user is able to post
      // in and use that.
      if (typeof(msg_area.sub[bbs.cursub_code]) != "undefined")
      {
        retObj.subBoardCode = bbs.cursub_code;
        retObj.grpIndex = msg_area.sub[bbs.cursub_code].grp_index;
      }
      else
      {
        var firstPostableSubInfo = getFirstPostableSubInfo();
        retObj.subBoardCode = firstPostableSubInfo.subCode;
        retObj.grpIndex = firstPostableSubInfo.grpIndex;
      }

      // If we got a valid sub-board code, then open that sub-board
      // and get the total number of messages from it.
      if (retObj.subBoardCode.length > 0)
      {
        var tmpMsgBaseObj = new MsgBase(retObj.subBoardCode);
        if (tmpMsgBaseObj.open())
        {
          retObj.totalNumMsgs = tmpMsgBaseObj.total_msgs;
          tmpMsgBaseObj.close();
        }
        else
          retObj.totalNumMsgs = 0;
      }
      else
       retObj.totalNumMsgs = 0;
    }
  }

  // If the Digital Distortion Message Lister drop file exists,
  // then use the message information from that file instead.
  if (file_exists(gDDML_DROP_FILE_NAME))
  {
    var SMBInfoFile = new File(gDDML_DROP_FILE_NAME);
    if (SMBInfoFile.open("r"))
    {
      var fileLine = null; // A line read from the file
      var lineNum = 0; // Will be incremented at the start of the while loop, to start at 1.
      while (!SMBInfoFile.eof)
      {
         ++lineNum;

         // Read the next line from the config file.
         fileLine = SMBInfoFile.readln(2048);

         // fileLine should be a string, but I've seen some cases
         // where for some reason it isn't.  If it's not a string,
         // then continue onto the next line.
         if (typeof(fileLine) != "string")
            continue;

          // Depending on the line number, set the appropriate value
          // in retObj.
          switch (lineNum)
          {
            case 1:
              retObj.lastMsg = +fileLine;
              break;
            case 2:
              retObj.totalNumMsgs = +fileLine;
              break;
            case 3:
              retObj.curMsgNum = +fileLine;
              retObj.msgNumIsOffset = false; // For Message Lister 1.36 and newer
              break;
            case 4:
              retObj.subBoardCode = fileLine;
              retObj.grpIndex = msg_area.sub[retObj.subBoardCode].grp_index;
              break;
            default:
              break;
          }
       }
       SMBInfoFile.close();
    }
  }

  return retObj;
}

// Gets the "From" name of the current message being replied to.
// Only for use when replying to a message in a public sub-board.
// The message information is retrieved from DDML_SyncSMBInfo.txt
// in the node dir if it exists or from the bbs object's properties.
// On error, the string returned will be blank.
//
// Parameters:
//  pMsgInfo: Optional: An object returned by getCurMsgInfo().  If this
//            parameter is not specified, this function will call
//            getCurMsgInfo() to get it.
function getFromNameForCurMsg(pMsgInfo)
{
  var fromName = "";

  // Get the information about the current message from
  // DDML_SyncSMBInfo.txt in the node dir if it exists or from
  // the bbs object's properties.  Then open the message header
  // and get the 'from' name from it.
  var msgInfo = null;
  if ((pMsgInfo != null) && (typeof(pMsgInfo) != "undefined"))
    msgInfo = pMsgInfo;
  else
    msgInfo = getCurMsgInfo();

  if (msgInfo.subBoardCode.length > 0)
  {
    var msgBase = new MsgBase(msgInfo.subBoardCode);
    if (msgBase != null)
    {
      msgBase.open();
      var hdr = msgBase.get_msg_header(msgInfo.msgNumIsOffset, msgInfo.curMsgNum, true);
      if (hdr != null)
        fromName = hdr.from;
      msgBase.close();
    }
  }

  return fromName;
}

// Calculates & returns a page number.
//
// Parameters:
//  pTopIndex: The index (0-based) of the topmost item on the page
//  pNumPerPage: The number of items per page
//
// Return value: The page number
function calcPageNum(pTopIndex, pNumPerPage)
{
  return ((pTopIndex / pNumPerPage) + 1);
}

// Returns whether or not the user is posting in a message sub-board.
// If false, that means the user is sending private email or netmail.
// This function determines whether the user is posting in a message
// sub-board if the message area name is not "Electronic Mail" and
// is not "NetMail".
//
// Parameters:
//  pMsgAreaName: The name of the message area.
function postingInMsgSubBoard(pMsgAreaName)
{
  if (typeof(pMsgAreaName) != "string")
    return false;
  if (pMsgAreaName.length == 0)
    return false;

  return ((pMsgAreaName != "Electronic Mail") && (pMsgAreaName != "NetMail"));
}

// Returns the number of properties of an object.
//
// Parameters:
//  pObject: The object for which to count properties
//
// Return value: The number of properties of the object
function numObjProperties(pObject)
{
  if (pObject == null)
    return 0;

  var numProps = 0;
  for (var prop in pObject) ++numProps;
  return numProps;
}

//
// Paramters:
//  pSubBoardCode: Synchronet's internal code for the sub-board to post in
//  pTo: The name of the person to send the message to
//  pSubj: The subject of the email
//  pMessage: The email message
//  pFromUserNum: The number of the user to use as the message sender.
//                This is optional; if not specified, the current user
//                will be used.
//
// Return value: String - Blank on success, or message on failure.
function postMsgToSubBoard(pSubBoardCode, pTo, pSubj, pMessage, pFromUserNum)
{
  // Return if the parameters are invalid.
  if (typeof(pSubBoardCode) != "string")
    return ("Sub-board code is not a string");
  if (typeof(pTo) != "string")
    return ("To name is not a string");
  if (pTo.length == 0)
    return ("The 'to' user name is blank");
  if (typeof(pSubj) != "string")
    return ("Subject is not a string");
  if (pSubj.length == 0)
    return ("The subject is blank");
  if (typeof(pMessage) != "string")
    return ("Message is not a string");
  if (pMessage.length == 0)
    return ("Not sending an empty message");
  if (typeof(pFromUserNum) != "number")
    return ("From user number is not a number");
  if ((pFromUserNum <= 0) || (pFromUserNum > system.lastuser))
    return ("Invalid user number");

  // LOad the user record specified by pFromUserNum.  If it's a deleted user,
  // then return an error.
  var fromUser = new User(pFromUserNum);
  if (fromUser.settings & USER_DELETED)
    return ("The 'from' user is marked as deleted");

  var msgbase = new MsgBase(pSubBoardCode);
  if ((msgbase.open != undefined) && !msgbase.open())
  {
    msgbase.close();
    return ("Error opening the message area: " + msgbase.last_error);
  }

  // Create the message header, and send the message.
  var header = new Object();
  header.to = pTo;
  header.from_net_type = NET_NONE;
  header.to_net_type = NET_NONE;
  header.from = fromUser.alias;
  header.from_ext = fromUser.number;
  header.from_net_addr = fromUser.netmail;
  header.subject = pSubj;
  var saveRetval = msgbase.save_msg(header, pMessage);
  msgbase.close();

  if (!saveRetval)
    return ("Error saving the message: " + msgbase.last_error);

  return "";
}

// Reads the current user's message signature file (if it exists)
// and returns its contents.
//
// Return value: An object containing the following properties:
//               sigFileExists: Boolean - Whether or not the user's signature file exists
//               sigContents: String - The user's message signature
function readUserSigFile()
{
  var retObj = new Object();
  retObj.sigFileExists = false;
  retObj.sigContents = "";

  // The user signature files are located in sbbs/data/user, and the filename
  // is the user number (zero-padded up to 4 digits) + .sig
  var userSigFilename = backslash(system.data_dir + "user") + format("%04d.sig", user.number);
  retObj.sigFileExists = file_exists(userSigFilename);
  if (retObj.sigFileExists)
  {
    var msgSigFile = new File(userSigFilename);
    if (msgSigFile.open("r"))
    {
      var fileLine = ""; // A line read from the file
      while (!msgSigFile.eof)
      {
        fileLine = msgSigFile.readln(2048);
        // fileLine should be a string, but I've seen some cases
        // where for some reason it isn't.  If it's not a string,
        // then continue onto the next line.
        if (typeof(fileLine) != "string")
          continue;

        retObj.sigContents += fileLine + "\r\n";
      }

      msgSigFile.close();
    }
  }

  return retObj;
}

// Returns the sub-board code and group index for the first sub-board
// the user is allowed to post in.  If none are found, the sub-board
// code will be a blank string and the group index will be 0.
//
// Return value: An object with the following properties:
//               subCode: The sub-board code
//               grpIndex: The group index of the sub-board
function getFirstPostableSubInfo()
{
  var retObj = new Object();
  retObj.subCode = "";
  retObj.grpIndex = 0;

  var continueOn = true;
  for (var groupIdx = 0; (groupIdx < msg_area.grp_list.length) && continueOn; ++groupIdx)
  {
     for (var subIdx = 0; (subIdx < msg_area.grp_list[groupIdx].sub_list.length) && continueOn; ++subIdx)
     {
        if (user.compare_ars(msg_area.grp_list[groupIdx].sub_list[subIdx].ars) &&
            user.compare_ars(msg_area.grp_list[groupIdx].sub_list[subIdx].post_ars))
        {
           retObj.subCode = msg_area.grp_list[groupIdx].sub_list[subIdx].code;
           retObj.grpIndex = groupIdx;
           continueOn = false;
           break;
        }
     }
  }

  return retObj;
}

// Reads SlyEdit_TextReplacements.cfg (from sbbs/mods, sbbs/ctrl, or the
// script's directory) and populates an associative array with the WORD=text
// pairs.  When not using regular expressions, the key will be in all uppercase
// and the value in lowercase.  This function will read up to 9999 replacements.
//
// Parameters:
//  pArray: The array to populate.  Must be created as "new Array()".
//  pRegex: Whether or not the text replace feature is configured to use regular
//          expressions.  If so, then the search words in the array will not
//          be converted to uppercase and the replacement text will not be
//          converted to lowercase.
//
// Return value: The number of text replacements added to the array.
function populateTxtReplacements(pArray, pRegex)
{
   var numTxtReplacements = 0;

   // Note: Limited to words without spaces.
   // Open the word replacements configuration file
   var wordReplacementsFilename = genFullPathCfgFilename("SlyEdit_TextReplacements.cfg", gStartupPath);
   var arrayPopulated = false;
   var wordFile = new File(wordReplacementsFilename);
   if (wordFile.open("r"))
   {
      var fileLine = null;      // A line read from the file
      var equalsPos = 0;        // Position of a = in the line
      var wordToSearch = null; // A word to be replaced
      var substWord = null;    // The word to substitue
      // This tests numTxtReplacements < 9999 so that the 9999th one is the last
      // one read.
      while (!wordFile.eof && (numTxtReplacements < 9999))
      {
         // Read the next line from the config file.
         fileLine = wordFile.readln(2048);

         // fileLine should be a string, but I've seen some cases
         // where for some reason it isn't.  If it's not a string,
         // then continue onto the next line.
         if (typeof(fileLine) != "string")
            continue;
         // If the line starts with with a semicolon (the comment
         // character) or is blank, then skip it.
         if ((fileLine.substr(0, 1) == ";") || (fileLine.length == 0))
            continue;

         // Look for an equals sign, and if found, separate the line
         // into the setting name (before the =) and the value (after the
         // equals sign).
         equalsPos = fileLine.indexOf("=");
         if (equalsPos <= 0)
            continue; // = not found or is at the beginning, so go on to the next line

         // Extract the word to search and substitution word from the line.  If
         // not using regular expressions, then convert the word to search to
         // all uppercase for case-insensitive searching.
         wordToSearch = trimSpaces(fileLine.substr(0, equalsPos), true, false, true);
         substWord = strip_ctrl(trimSpaces(fileLine.substr(equalsPos+1), true, false, true));
         // Make sure substWord only contains printable characters.  If not, then
         // skip this one.
         var substIsPrintable = true;
         for (var i = 0; (i < substWord.length) && substIsPrintable; ++i)
            substIsPrintable = isPrintableChar(substWord.charAt(i));
         if (!substIsPrintable)
            continue;

         // And add the search word and replacement text to pArray.
         if (pRegex)
         {
            if (wordToSearch.toUpperCase() != substWord.toUpperCase())
            {
               pArray[wordToSearch] = substWord;
               ++numTxtReplacements;
            }
         }
         else
         {
            wordToSearch = wordToSearch.toUpperCase();
            if (wordToSearch != substWord.toUpperCase())
            {
               pArray[wordToSearch] = substWord;
               ++numTxtReplacements;
            }
         }
      }

      wordFile.close();
   }

   return numTxtReplacements;
}

function moveGenColorsToGenSettings(pColorsArray, pCfgObj)
{
   // Set up an array of color setting names 
   var colorSettingStrings = new Array();
   colorSettingStrings.push("crossPostBorder"); // Deprecated
   colorSettingStrings.push("crossPostBorderText"); // Deprecated
   colorSettingStrings.push("listBoxBorder");
   colorSettingStrings.push("listBoxBorderText");
   colorSettingStrings.push("crossPostMsgAreaNum");
   colorSettingStrings.push("crossPostMsgAreaNumHighlight");
   colorSettingStrings.push("crossPostMsgAreaDesc");
   colorSettingStrings.push("crossPostMsgAreaDescHighlight");
   colorSettingStrings.push("crossPostChk");
   colorSettingStrings.push("crossPostChkHighlight");
   colorSettingStrings.push("crossPostMsgGrpMark");
   colorSettingStrings.push("crossPostMsgGrpMarkHighlight");
   colorSettingStrings.push("msgWillBePostedHdr");
   colorSettingStrings.push("msgPostedGrpHdr");
   colorSettingStrings.push("msgPostedSubBoardName");
   colorSettingStrings.push("msgPostedOriginalAreaText");
   colorSettingStrings.push("msgHasBeenSavedText");
   colorSettingStrings.push("msgAbortedText");
   colorSettingStrings.push("emptyMsgNotSentText");
   colorSettingStrings.push("genMsgErrorText");
   colorSettingStrings.push("txtReplacementList");

   var colorName = "";
   for (var i = 0; i < colorSettingStrings.length; ++i)
   {
      colorName = colorSettingStrings[i];
      if (pColorsArray.hasOwnProperty(colorName))
      {
         pCfgObj.genColors[colorName] = pColorsArray[colorName];
         delete pColorsArray[colorName];
      }
   }
   // If listBoxBorder and listBoxBorderText exist in the general colors settings,
   // then remove crossPostBorder and crossPostBorderText if they exist.
   if (pCfgObj.genColors.hasOwnProperty["listBoxBorder"] && pCfgObj.genColors.hasOwnProperty["crossPostBorder"])
   {
      // Favor crossPostBorder to preserve backwards compatibility.
      pCfgObj.genColors["listBoxBorder"] = pCfgObj.genColors["crossPostBorder"];
      delete pCfgObj.genColors["crossPostBorder"];
   }
   if (pCfgObj.genColors.hasOwnProperty["listBoxBorderText"] && pCfgObj.genColors.hasOwnProperty["crossPostBorderText"])
   {
      // Favor crossPostBorderText to preserve backwards compatibility.
      pCfgObj.genColors["listBoxBorderText"] = pCfgObj.genColors["crossPostBorderText"];
      delete pCfgObj.genColors["crossPostBorderText"];
   }
}

// Returns whether or not a character is a letter.
//
// Parameters:
//  pChar: The character to test
//
// Return value: Boolean - Whether or not the character is a letter
function charIsLetter(pChar)
{
   return /^[ABCDEFGHIJKLMNOPQRSTUVWXYZ�������������������������������������������������������������]$/.test(pChar.toUpperCase());
}

// Returns the word in a text line at a given index.  If the index
// is at a space, then this function will return the word before
// (to the left of) the space.
//
// Parameters:
//  pEditLinesIndex: The index of the line to look at (0-based)
//  pCharIndex: The character index in the text line (0-based)
//
// Return value: An object containing the following properties:
//               foundWord: Whether or not a word was found (boolean)
//               word: The word in the edit line at the given indexes (text)
//               editLineIndex: The index of the edit line (integer)
//               startIdx: The index of the first character of the word (integer)
//               endIndex: The index of the last character of the word (integer)
function getWordFromEditLine(pEditLinesIndex, pCharIndex)
{
   var retObj = new Object();
   retObj.foundWord = false;
   retObj.word = "";
   retObj.editLineIndex = pEditLinesIndex;
   retObj.startIdx = 0;
   retObj.endIndex = 0;

   // Parameter checking
   if ((pEditLinesIndex < 0) || (pEditLinesIndex >= gEditLines.length))
   {
      retObj.editLineIndex = 0;
      return retObj;
   }
   if ((pCharIndex < 0) || (pCharIndex >= gEditLines[pEditLinesIndex].text.length))
   {
      //displayDebugText(1, 1, "pCharIndex: " + pCharIndex, null, true, false); // Temporary
      //displayDebugText(1, 2, "Line len: " + gEditLines[pEditLinesIndex].text.length, console.getxy(), true, false); // Temporary
      return retObj;
   }

   // If pCharIndex specifies the index of a space, then look for a non-space
   // character before it.
   var charIndex = pCharIndex;
   while (gEditLines[pEditLinesIndex].text.charAt(charIndex) == " ")
      --charIndex;
   // Look for the start & end of the word based on the indexes of a space
   // before and at/after the given character index.
   var wordStartIdx = charIndex;
   var wordEndIdx = charIndex;
   while ((gEditLines[pEditLinesIndex].text.charAt(wordStartIdx) != " ") && (wordStartIdx >= 0))
      --wordStartIdx;
   ++wordStartIdx;
   while ((gEditLines[pEditLinesIndex].text.charAt(wordEndIdx) != " ") && (wordEndIdx < gEditLines[pEditLinesIndex].text.length))
      ++wordEndIdx;
   --wordEndIdx;

   retObj.foundWord = true;
   retObj.startIdx = wordStartIdx;
   retObj.endIndex = wordEndIdx;
   retObj.word = gEditLines[pEditLinesIndex].text.substring(wordStartIdx, wordEndIdx+1);
   return retObj;
}

// Performs text replacement (AKA macro replacement) in an edit line.
//
// Parameters:
//  pTxtReplacements: An associative array of text to be replaced (i.e.,
//                    gTxtReplacements)
//  pEditLinesIndex: The index of the line in gEditLines
//  pCharIndex: The current character index in the text line
//  pUseRegex: Whether or not to treat the text replacement search string as a
//             regular expression.
//
// Return value: An object containing the following properties:
//               textLineIndex: The updated text line index (integer)
//               wordLenDiff: The change in length of the word that
//                            was replaced (integer)
//               wordStartIdx: The index of the first character in the word.
//                             Only valid if a word was found.  Otherwise, this
//                             will be 0.
//               newTextEndIdx: The index of the last character in the new
//                              text.  Only valid if a word was replaced.
//                              Otherwise, this will be 0.
//               newTextLen: The length of the new text in the string.  Will be
//                           the length of the existing word if the word wasn't
//                           replaced or 0 if no word was found.
//               madeTxtReplacement: Whether or not a text replacement was made
//                                   (boolean)
function doMacroTxtReplacementInEditLine(pTxtReplacements, pEditLinesIndex, pCharIndex, pUseRegex)
{
   var retObj = new Object();
   retObj.textLineIndex = pCharIndex;
   retObj.wordLenDiff = 0;
   retObj.wordStartIdx = 0;
   retObj.newTextEndIdx = 0;
   retObj.newTextLen = 0;
   retObj.madeTxtReplacement = false;

   var wordObj = getWordFromEditLine(pEditLinesIndex, retObj.textLineIndex);
   if (wordObj.foundWord)
   {
      retObj.wordStartIdx = wordObj.startIdx;
      retObj.newTextLen = wordObj.word.length;

      // See if the word starts with a capital letter; if so, we'll capitalize
      // the replacement word.
      //var firstCharUpper = (wordObj.word.charAt(0) == wordObj.word.charAt(0).toUpperCase());
      var firstCharUpper = false;
      var txtReplacement = "";
      if (pUseRegex)
      {
         // Since a regular expression might have more characters in addition
         // to the actual word, we need to go through all the replacement strings
         // in pTxtReplacements and use the first one that changes the text.
         for (var prop in pTxtReplacements)
         {
            if (pTxtReplacements.hasOwnProperty(prop))
            {
               var regex = new RegExp(prop);
               txtReplacement = wordObj.word.replace(regex, pTxtReplacements[prop]);
               retObj.madeTxtReplacement = (txtReplacement != wordObj.word);
               // If a text replacement was made, then check and see if the first
               // letter in the original text was uppercase, and if so, make the
               // first letter in the new text (txtReplacement) uppercase.
               if (retObj.madeTxtReplacement)
               {
                  if (firstLetterIsUppercase(wordObj.word))
                  {
                     var letterInfo = getFirstLetterFromStr(txtReplacement);
                     if (letterInfo.idx > -1)
                     {
                        txtReplacement = txtReplacement.substr(0, letterInfo.idx)
                                       + letterInfo.letter.toUpperCase()
                                       + txtReplacement.substr(letterInfo.idx+1);
                     }
                  }
                  // Now that we've made a text replacement, stop going through
                  // pTxtReplacements looking for a matching regex.
                  break;
               }
            }
         }
      }
      else
      {
         // Not using a regular expression.
         firstCharUpper = (wordObj.word.charAt(0) == wordObj.word.charAt(0).toUpperCase());
         // Convert the word to all uppercase to do the case-insensitive lookup
         // in pTxtReplacements.
         wordObj.word = wordObj.word.toUpperCase();
         if (pTxtReplacements.hasOwnProperty(wordObj.word))
         {
            txtReplacement = pTxtReplacements[wordObj.word];
            retObj.madeTxtReplacement = true;
         }
      }
      if (retObj.madeTxtReplacement)
      {
         if (firstCharUpper)
            txtReplacement = txtReplacement.charAt(0).toUpperCase() + txtReplacement.substr(1);
         gEditLines[pEditLinesIndex].text = gEditLines[pEditLinesIndex].text.substr(0, wordObj.startIdx)
                                          + txtReplacement
                                          + gEditLines[pEditLinesIndex].text.substr(wordObj.endIndex+1);
         // Based on the difference in word length, update the data that
         // matters (retObj.textLineIndex, which keeps track of the index of the current line).
         // Note: The horizontal cursor position variable should be replaced after calling this
         // function.
         retObj.wordLenDiff = txtReplacement.length - wordObj.word.length;
         retObj.textLineIndex += retObj.wordLenDiff;
         retObj.newTextEndIdx = wordObj.endIndex + retObj.wordLenDiff;
         retObj.newTextLen = txtReplacement.length;
      }
   }

   return retObj;
}

// For configuration files, this function returns a fully-pathed filename.
// This function first checks to see if the file exists in the sbbs/mods
// directory, then the sbbs/ctrl directory, and if the file is not found there,
// this function defaults to the given default path.
//
// Parameters:
//  pFilename: The name of the file to look for
//  pDefaultPath: The default directory (must have a trailing separator character)
function genFullPathCfgFilename(pFilename, pDefaultPath)
{
   var fullyPathedFilename = system.mods_dir + pFilename;
   if (!file_exists(fullyPathedFilename))
      fullyPathedFilename = system.ctrl_dir + pFilename;
   if (!file_exists(fullyPathedFilename))
   {
      if (typeof(pDefaultPath) == "string")
      {
         // Make sure the default path has a trailing path separator
         var defaultPath = backslash(pDefaultPath);
         fullyPathedFilename = defaultPath + pFilename;
      }
      else
         fullyPathedFilename = pFilename;
   }
   return fullyPathedFilename;
}

// Returns the first letter found in a string and its index.  If a letter is
// not found, the string returned will be blank, and the index will be -1.
//
// Parameters:
//  pString: The string to search
//
// Return value: An object with the following properties:
//               letter: The first letter found in the string, or a blank string if none was found
//               idx: The index of the first letter found, or -1 if none was found
function getFirstLetterFromStr(pString)
{
   var retObj = new Object;
   retObj.letter = "";
   retObj.idx = -1;

   var theChar = "";
   for (var i = 0; (i < pString.length) && (retObj.idx == -1); ++i)
   {
      theChar = pString.charAt(i);
      if (charIsLetter(theChar))
      {
         retObj.idx = i;
         retObj.letter = theChar;
      }
   }

   return retObj;
}

// Returns whether or not the first letter in a string is uppercase.  If the
// string doesn't contain any letters, then this function will return false.
//
// Parameters:
//  pString: The string to search
//
// Return value: Boolean - Whether or not the first letter in the string is uppercase
function firstLetterIsUppercase(pString)
{
   var firstIsUpper = false;
   var letterObj = getFirstLetterFromStr(pString);
   if (letterObj.idx > -1)
   {
      var theLetter = pString.charAt(letterObj.idx);
      firstIsUpper = (theLetter == theLetter.toUpperCase());
   }
   return firstIsUpper;
}

// This function displays debug text at a given location on the screen, then
// moves the cursor back to a given location.
//
// Parameters:
//  pDebugX: The X lcoation of where to write the debug text
//  pDebugY: The Y lcoation of where to write the debug text
//  pText: The text to write at the debug location
//  pOriginalPos: An object with x and y properties containing the original cursor position
//  pClearDebugLineFirst: Whether or not to clear the debug line before writing the text
//  pPauseAfter: Whether or not to pause after displaying the text
function displayDebugText(pDebugX, pDebugY, pText, pOriginalPos, pClearDebugLineFirst, pPauseAfter)
{
	console.gotoxy(pDebugX, pDebugY);
	if (pClearDebugLineFirst)
		console.clearline();
	// Output the text
	console.print(pText);
	if (pPauseAfter)
      console.pause();
	if ((typeof(pOriginalPos) != "undefined") && (pOriginalPos != null))
		console.gotoxy(pOriginalPos);
}