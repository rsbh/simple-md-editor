Feature: Reading files

  The editor loads markdown from disk and remembers where it came from, so it
  can save back to the same place and notice when something else changes it.

  Scenario: Reading a file returns its text and where it came from
    Given a file "notes.md" containing:
      """
      # Notes

      Something worth keeping.
      """
    When I read "notes.md"
    Then the read succeeds
    And the document text is:
      """
      # Notes

      Something worth keeping.
      """
    And the document path is "notes.md"
    And the document carries a modification stamp

  Scenario: Reading a file that is not there fails
    When I read "missing.md"
    Then the read fails
