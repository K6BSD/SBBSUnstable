SRC_ROOT	?=	..
include $(SRC_ROOT)/build/Common.gmake

ifdef XPSEM
	OBJS-MT	+=	$(OBJODIR-MT)$(DIRSEP)xpsem.o$(OFILE)
endif

# Executable Build Rule
$(WRAPTEST): $(OBJODIR)/wraptest.o $(DEPS)
	@echo Linking $@
	$(QUIET)$(CC) $(CFLAGS) -o $@ $(LDFLAGS) $^ $(LIBS)

$(XPDEV_LIB): $(OBJS)
	ar rc $@ $^
	ranlib $@

$(XPDEV-MT_LIB): $(OBJS-MT)
	ar rc $@ $^
	ranlib $@
