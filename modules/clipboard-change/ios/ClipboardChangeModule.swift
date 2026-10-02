import ExpoModulesCore
import UIKit

// UIPasteboard's changeCount goes up whenever anything new is copied. Reading it never reads what was
// copied, so iOS shows no paste alert. Parso compares it with the last count it offered.
public class ClipboardChangeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClipboardChange")

    Function("changeCount") { () -> Int in
      return UIPasteboard.general.changeCount
    }
  }
}
