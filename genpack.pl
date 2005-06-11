#!/usr/bin/perl

if($#ARGV != 2) {
	print <<ENDOFUSAGE;
Usage: $0 infile.h outhead.h outprog.c

ENDOFUSAGE
	exit(1);
}

my ($infile, $outhead, $outc) = @ARGV;
open IN,'<',$infile;

while (<IN>) {
	$header .= $_;
}
close IN;

my $defs='';
my $protos='';
my $functions='';

my $count = 0;
my @structs = ();
while($header =~ m/struct\s+([^\s\r\n]*)[\s\r\n]+{([^}]*)}/gs) {
	my($name, $def) = ($1,$2);
	my ($packcode, $unpackcode, $size, @ints) = parse_defs($name, $def);
	if(defined $size) {
		$count++;
		push @structs,"+ $name";
		$defs .= $size;
		$protos .= "int pack_$name\_struct(char *buf, struct $name *data);\n";
		$protos .= "int unpack_$name\_struct(struct $name *data, char *buf);\n";
		$functions .= "int pack_$name\_struct(char *buf, struct $name *data)\n";
		$functions .= "{\n";
		$functions .= "\tchar\t*p;\n";
		if($#ints >= 0) {
			$functions .= "\tint\t\t".join(', ',@ints).";\n";
		}
		$functions .="\n\tp = buf;\n";
		$functions .= $packcode;
		$functions .="\n\treturn((int)(p-buf));\n}\n\n";
		$functions .= "int unpack_$name\_struct(struct $name *data, char *buf)\n";
		$functions .= "{\n";
		$functions .= "\tchar\t*p;\n";
		if($#ints >= 0) {
			$functions .= "\tint\t\t".join(', ',@ints).";\n";
		}
		$functions .="\n\tp = buf;\n";
		$functions .= $packcode;
		$functions .="\n\treturn((int)(p-buf));\n}\n\n";
	}
	else {
		push @structs,"! $name";
	}
}

if($count) {
	open HEAD,'>',$outhead;
	open C,'>',$outc;

	print HEAD "/* Generated by genpack.pl from $infile on ".(scalar localtime(time))." */\n\n";
	my $macro = uc($outhead);
	$macro=~s/[^A-Z0-9]/_/g;
	print HEAD '#ifndef _INCLUDED_',$macro,"\n";
	print HEAD '#define _INCLUDED_',$macro,"\n\n";
	print HEAD "#include \"$infile\"\n#include \"xpendian.h\"\n\n";
	print HEAD "/* *_SIZE macros are the packed buffer size requred */\n";
	print HEAD $defs;
	print HEAD "\n/* Function prototypes */\n";
	print HEAD "#if defined(__cplusplus)\nextern \"C\" {\n#endif\n";
	print HEAD $protos;
	print HEAD "#if defined(__cplusplus)\n}\n#endif";
	print HEAD "\n\n";
	print HEAD "#endif /* Do not add anything after this line! */\n";
	close HEAD;

	open C,'>',$outc;
	print HEAD "/* Generated by genpack.pl from $infile on ".(scalar localtime(time))." */\n\n";
	print C "#include \"$outhead\"\n\n";
	print C $functions;
	print C "\n";
	close C;

	print "$count structures read successfully\n+ indicates functions were created\n! indicates a failure\n\n";
	print join("\n", @structs),"\n";
}
else {
	print "No structures imported... files not created.\n";
}

sub parse_defs
{
	my ($sname, $defs)=@_;

	my $packcode='';
	my $unpackcode='';
	my %vars=();
	my %sizes=();

	# Remove comments
	$defs=~s|/\*.*?\*/||gs;
	my @lines=split(/[\r\n]+/, $defs);
	foreach my $line (@lines) {
		my ($p, $u);
		my @newvars;
		my $this_size=0;
		chomp $line;
		next if($line =~ /^\s*$/);
		if($line =~ m/^\s*((?:char)|(?:INT16)|(?:WORD)|(?:INT32)|(?:DWORD)|(?:float))\s+([^\s]+)\s*;\s*$/) {
			my ($type, $name) = ($1, $2);
			($p, $n, @newvars) = parse_line(\%sizes, $type, $name, 0);
		}
		elsif($line =~ m/^\s*struct\s+([^\s]+)\s+([^\s]+)\s*;\s*$/) {
			my ($struct, $name) = ($1, $2);
			($p, $n, @newvars) = parse_line(\%sizes, $struct, $name, 1);
		}
		else {
			print "Cannot parse: $line\n";
			return();
		}
		if(!defined $n) {
			return();
		}
		@vars{@newvars}=@newvars;
		$packcode .= $p;
		$unpackcode .= $u;
	}
	my $sizedef = '#define '.uc($sname)."_SIZE\t(";
	foreach my $key (keys %sizes) {
		if(defined $sizes{$key}{count} && !defined $sizes{$key}{multiplier}) {
			if($sizes{$key}{count} == 1) {
				$sizedef .= "$key + ";
			}
			else {
				$sizedef .= "($key * $sizes{$key}{count}) + ";
			}
		}
		elsif(!defined $sizes{$key}{count} && defined $sizes{$key}{multiplier}) {
			$sizes{$key}{multiplier} = substr($sizes{$key}{multiplier}, 0, -3);
			$sizedef .= "($key * ($sizes{$key}{multiplier})) + ";
		}
		elsif(defined $sizes{$key}{count} && defined $sizes{$key}{multiplier}) {
			$sizes{$key}{multiplier} = substr($sizes{$key}{multiplier}, 0, -3);
			$sizedef .= "($key * ($sizes{$key}{count} + $sizes{$key}{multiplier})) + ";
		}
	}
	$sizedef = substr($sizedef, 0, -3) . ")\n";
	return($packcode, $unpackcode, $sizedef, sort keys %vars);
}

sub parse_line
{
	my ($sizes, $type, $name, $struct) = @_;
	my $tabs = "\t";
	my $end = '';
	my %vars=();
	my $nextint='i';
	my ($packcode, $unpackcode);
	my $sizekey;

	if($struct) {
		$sizekey = uc($type).'_SIZE';
	}
	else {
		$sizekey = "sizeof($type)";
	}
	if($name =~ /\[/) {		# Handle arrays!
		while($name =~ s/\[([^\]]+)\]/;$nextint;/) {
			my $size = $1;
			$packcode .= $tabs."for($nextint = 0; $nextint < $size; $nextint++) {\n";
			$unpackcode .= $tabs."for($nextint = 0; $nextint < $size; $nextint++) {\n";
			$sizes->{$sizekey}{multiplier} .= "$size * ";
			$end = "$tabs}\n$end";
			$tabs .= "\t";
			$vars{$nextint}=1;
			$nextint=chr(ord($nextint)+1);
		}
		$sizes->{$sizekey}{multiplier} = substr($sizes->{$sizekey}{multiplier}, 0, -3);
		$sizes->{$sizekey}{multiplier} .= ' + ';
		$name =~ s/;(.);/[$1]/g;
	}
	else {
		$sizes->{$sizekey}{count}++;
	}
	$name = "data->$name";
	my ($p, $u) = pack_line($type, $name, $struct, $tabs);
	$p = "$packcode$p$end";
	$u = "$unpackcode$u$end";
	return($p, $u, sort keys %vars);
}

sub pack_line
{
	my ($type, $name, $struct, $tabs)=@_;
	my $packcode = '';
	my $unpackcode = '';

	# ie: *(INT32)p = LE_LONG($name);
	if(!$struct) {
		if($type eq 'char') {
			$packcode .= $tabs."*p = $name;\n";
			$packcode .= $tabs."p++;\n";
			$unpackcode .= $tabs."$name = *p;\n";
			$unpackcode .= $tabs."p++;\n";
		}
		elsif($type eq 'INT16') {
			$packcode .= $tabs."*(INT16 *)p = LE_SHORT($name);\n";
			$packcode .= $tabs."p += sizeof(INT16);\n";
			$unpackcode .= $tabs."$name = LE_SHORT(*(INT16 *)p);\n";
			$unpackcode .= $tabs."p += sizeof(INT16);\n";
		}
		elsif($type eq 'WORD') {
			$packcode .= $tabs."*(WORD *)p = LE_SHORT($name);\n";
			$packcode .= $tabs."p += sizeof(WORD);\n";
			$unpackcode .= $tabs."$name = LE_SHORT(*(WORD *)p);\n";
			$unpackcode .= $tabs."p += sizeof(WORD);\n";
		}
		elsif($type eq 'INT32') {
			$packcode .= $tabs."*(INT32 *)p = LE_LONG($name);\n";
			$packcode .= $tabs."p += sizeof(INT32);\n";
			$unpackcode .= $tabs."$name = LE_LONG(*(INT32 *)p);\n";
			$unpackcode .= $tabs."p += sizeof(INT32);\n";
		}
		elsif($type eq 'DWORD') {
			$packcode .= $tabs."*(DWORD *)p = LE_LONG($name);\n";
			$packcode .= $tabs."p += sizeof(DWORD);\n";
			$unpackcode .= $tabs."$name = LE_LONG(*(DWORD *)p);\n";
			$unpackcode .= $tabs."p += sizeof(DWORD);\n";
		}
		elsif($type eq 'float') {
			$packcode .= $tabs."*(DWORD *)p = LE_LONG(*((DWORD *)&($name)));\n";
			$packcode .= $tabs."p += sizeof(float);\n";
			$unpackcode .= $tabs."*(((DWORD *)&($name))) = LE_LONG(*(DWORD *)p);\n";
			$unpackcode .= $tabs."p += sizeof(DWORD);\n";
		}
		else {
			print "Unhandled type: $type\n";
			return(undef, undef);
		}
	}
	else {
		$packcode .= $tabs."p += pack_$type\_struct(p, &($name));\n";
		$unpackcode .= $tabs."p += unpack_$type\_struct(&($name), p);\n";
	}

	return($packcode, $unpackcode);
}
