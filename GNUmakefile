SRC_ROOT = ..
# Cross platform/compiler definitions
include $(SRC_ROOT)/build/Common.gmake	# defines clean and output directory rules

CFLAGS += $(XPDEV-MT_CFLAGS) $(CIOLIB-MT_CFLAGS)
X_HEADERS	?=	/usr/X11R6/include

OBJS	+=	$(MTOBJODIR)$(DIRSEP)curs_cio$(OFILE)
ifdef NO_X
 CFLAGS	+=	-DNO_X
else
 ifdef X_PATH
  X_HEADERS	?=	$(X_PATH)$(DIRSEP)include
 endif
 CFLAGS	+=	-I$(X_HEADERS)
 OBJS	+=	$(MTOBJODIR)$(DIRSEP)console$(OFILE) \
			$(MTOBJODIR)$(DIRSEP)x_cio$(OFILE)
endif
ifeq ($(os),netbsd)
 CFLAGS	+=	-DN_CURSES_LIB
endif

$(MTOBJODIR)$(DIRSEP)console$(OFILE).static:
	$(QUIET)$(DELETE) $(MTOBJODIR)$(DIRSEP)console$(OFILE)*
	$(QUIET)touch $(MTOBJODIR)$(DIRSEP)console$(OFILE).static	

$(MTOBJODIR)$(DIRSEP)console$(OFILE).dynamic:
	$(QUIET)$(DELETE) $(MTOBJODIR)$(DIRSEP)console$(OFILE)*
	$(QUIET)touch $(MTOBJODIR)$(DIRSEP)console$(OFILE).dynamic

# CIOLIB Library Link Rule
ifdef STATIC
$(CIOLIB-MT_BUILD): $(MTOBJODIR)$(DIRSEP)console$(OFILE).static $(MTOBJODIR) $(OBJS)
else
$(CIOLIB-MT_BUILD): $(MTOBJODIR)$(DIRSEP)console$(OFILE).dynamic $(MTOBJODIR) $(OBJS)
endif
	@echo Creating $@ ...
	$(QUIET)$(AR) rc $@ $(OBJS)
	$(QUIET)$(RANLIB) $@
