# GNUmakefile

#########################################################################
# Makefile for cross-platform development "wrappers" test				#
# For use with GNU make and GNU C Compiler								#
# @format.tab-size 4, @format.use-tabs true								#
#																		#
# usage: gmake [os=target_os]											#
#########################################################################

# $Id$

# Macros
DEBUG	=	1		# Comment out for release (non-debug) version
CC		=	gcc
SLASH	=	/
OFILE	=	o
CFLAGS	=	-Wall

ifndef $(os)
os		=	$(shell uname)
$(warning OS not specified on command line, setting to '$(os)'.)
endif

ODIR	:=	gcc.$(os)

DELETE	=	rm -fv

ifeq ($(os),FreeBSD)	# FreeBSD
CFLAGS	+= -D_THREAD_SAFE
LFLAGS	:=	-pthread
else					# Linux / Other UNIX
LFLAGS	:=	-lpthread
endif

ifdef DEBUG
CFLAGS	+=	-g -O0 -D_DEBUG 
ODIR	:=	$(ODIR).debug
else # RELEASE
ODIR	:=	$(ODIR).release
endif

include objects.mk		# defines $(OBJS)
include targets.mk		# defines all and clean targets

# Implicit C Compile Rule
$(ODIR)/%.o : %.c
	@echo Compiling $<
	@$(CC) $(CFLAGS) -c $< -o $@

# Create output directories
$(ODIR):
	mkdir $(ODIR)

# Executable Build Rule
$(WRAPTEST): $(ODIR)/wraptest.o $(OBJS)
	@echo Linking $@
	@$(CC) $(LFLAGS) $^ -o $@

