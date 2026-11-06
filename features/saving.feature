Feature: Saving files

  Saving writes exactly what the editor is holding, and refuses to overwrite a
  file that changed somewhere else since it was read.

  Background:
    Given a file "notes.md" containing:
      """
      original
      """
    And I have read "notes.md"

  Scenario: Saving writes the new text
    When I save "notes.md" with:
      """
      edited
      """
    Then the save succeeds
    And "notes.md" contains:
      """
      edited
      """

  Scenario: A file changed elsewhere is not overwritten
    Given "notes.md" was changed elsewhere to:
      """
      someone else's work
      """
    When I save "notes.md" with:
      """
      edited
      """
    Then the save reports a conflict
    And "notes.md" contains:
      """
      someone else's work
      """

  Scenario: A conflict can be overridden deliberately
    Given "notes.md" was changed elsewhere to:
      """
      someone else's work
      """
    When I save "notes.md" forcing the write with:
      """
      edited
      """
    Then the save succeeds
    And "notes.md" contains:
      """
      edited
      """

  Scenario: Saving a file that was deleted elsewhere recreates it
    Given "notes.md" was deleted elsewhere
    When I save "notes.md" with:
      """
      edited
      """
    Then the save succeeds
    And "notes.md" contains:
      """
      edited
      """

  Scenario: Saving without a path fails
    When I save "" with:
      """
      edited
      """
    Then the save fails
