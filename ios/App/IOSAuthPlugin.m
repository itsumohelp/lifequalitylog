#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(IOSAuthPlugin, "IOSAuthPlugin",
    CAP_PLUGIN_METHOD(startGoogleAuth, CAPPluginReturnPromise);
)
