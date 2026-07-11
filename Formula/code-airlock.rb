class CodeAirlock < Formula
  desc "Run coding agents in disposable Docker Sandbox microVMs"
  homepage "https://github.com/Trivo25/code-airlock"
  license "MIT"
  head "https://github.com/Trivo25/code-airlock.git", branch: "main"

  def install
    bin.install "code-airlock"
    generate_completions_from_executable(bin/"code-airlock", "completion", shells: [:bash, :zsh])
  end

  test do
    assert_match "code-airlock", shell_output("#{bin}/code-airlock help")
  end
end
